"""Browser regression checks. Isolated preview only; never production."""
from pathlib import Path
import secrets
from playwright.sync_api import sync_playwright, expect

BASE = 'https://hs-admin-preview.70.38.101.106.sslip.io'
SITE = 'https://hs-site-preview.70.38.101.106.sslip.io'
OUT = Path(__file__).parent / 'output/playwright/ui-v4'

def verify(env):
    assert 'preview.' in BASE
    OUT.mkdir(parents=True, exist_ok=True)
    tag = 'UI' + secrets.token_hex(4)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 1440, 'height': 1000}, extra_http_headers={'Origin': BASE})
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('dialog', lambda d: d.accept())
        login = ctx.request.post(BASE + '/api/users/login', data={'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']})
        assert login.ok, login.text()
        for route, title, nav in [('media', 'Imagens', 'media'), ('categories', 'Categorias', 'categories'), ('redirects', 'Redirecionamentos', 'redirects'), ('activity', 'Histórico de atividades', 'activity'), ('posts', 'Artigos e publicações', 'posts')]:
            page.goto(BASE + '/admin/collections/' + route + '?depth=1&limit=10', wait_until='networkidle')
            expect(page.get_by_role('heading', name=title, exact=True)).to_be_visible()
            expect(page.locator('#nav-' + nav)).to_have_attribute('aria-current', 'page')
            assert page.locator('.nav-toggler:visible').count() == 0
            assert page.get_by_text('Gestão do seu site', exact=True).count() == 0
            page.screenshot(path=str(OUT / (route + '.png')), full_page=True)
        page.goto(BASE + '/admin/account', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Minha conta', exact=True)).to_be_visible()
        assert page.locator('aside.nav').count() == 1
        page.screenshot(path=str(OUT / 'account.png'), full_page=True)
        # Create a category through its dialog, then edit it.
        page.goto(BASE + '/admin/collections/categories', wait_until='networkidle')
        page.get_by_role('button', name='Nova categoria', exact=True).click()
        dialog = page.get_by_role('dialog')
        dialog.get_by_label('Nome da categoria').fill(tag)
        dialog.get_by_role('button', name='Salvar alterações').click()
        expect(dialog).not_to_be_visible()
        expect(page.get_by_role('heading', name=tag, exact=True)).to_be_visible()
        # A real file upload; the existing project logo is used as a fixture.
        page.goto(BASE + '/admin/collections/media', wait_until='networkidle')
        page.get_by_role('button', name='Enviar imagem', exact=True).click()
        dialog = page.get_by_role('dialog')
        dialog.locator('input[type=file]').set_input_files(str(Path(__file__).parent / 'apps/cms/public/logo.png'))
        dialog.get_by_role('textbox').fill(tag + ' imagem')
        dialog.get_by_role('button', name='Salvar imagem').click()
        expect(dialog).not_to_be_visible(timeout=30000)
        expect(page.get_by_role('button').filter(has_text=tag + ' imagem')).to_be_visible()
        media = ctx.request.get(BASE + '/api/media', params={'where[alt][equals]': tag + ' imagem'}).json()['docs'][0]
        assert ctx.request.get(media['url']).ok
        # Native rich-text creation must open, save, and publish successfully.
        page.goto(BASE + '/admin/collections/posts', wait_until='networkidle')
        assert page.get_by_role('link', name='Novo artigo', exact=True).evaluate('(e)=>getComputedStyle(e).color') == 'rgb(255, 255, 255)'
        page.get_by_role('link', name='Novo artigo', exact=True).click()
        expect(page.locator('#field-title')).to_be_visible(timeout=30000)
        page.locator('#field-title').fill(tag + ' artigo')
        editor = page.locator('[contenteditable=true]').first
        editor.fill('Conteúdo de verificação do editor e publicação de artigos.')
        page.screenshot(path=str(OUT / 'article-editor.png'), full_page=True)
        page.get_by_role('button', name='Salvar rascunho', exact=True).click()
        page.wait_for_url(lambda u: '/posts/create' not in u, timeout=30000)
        expect(page.locator('#field-title')).to_have_value(tag + ' artigo')
        with page.expect_response(lambda r: '/api/posts/' in r.url and r.request.method == 'PATCH') as published:
            page.get_by_role('button', name='Publicar alterações', exact=True).click()
        assert published.value.ok, published.value.text()
        posts = ctx.request.get(BASE + '/api/posts', params={'where[title][equals]': tag + ' artigo'}).json()['docs']
        assert posts and posts[0]['_status'] == 'published'
        response = ctx.request.get(SITE + '/blog/' + posts[0]['slug'])
        assert response.ok and 'Conteúdo de verificação' in response.text()
        # Verify custom URL redirects and their application to the real site.
        page.goto(BASE + '/admin/collections/redirects', wait_until='networkidle')
        page.get_by_role('button', name='Novo redirecionamento').click()
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('textbox').nth(0).fill('/' + tag.lower())
        dialog.get_by_role('textbox').nth(1).fill('/blog/' + posts[0]['slug'])
        dialog.get_by_role('button', name='Salvar alterações').click()
        expect(dialog).not_to_be_visible(timeout=30000)
        response = ctx.request.get(SITE + '/' + tag.lower(), max_redirects=0)
        assert response.status == 301 and response.headers['location'] == '/blog/' + posts[0]['slug']
        # Used categories cannot be deleted.
        category = ctx.request.get(BASE + '/api/categories', params={'where[title][equals]': tag}).json()['docs'][0]
        assert ctx.request.patch(BASE + '/api/posts/' + str(posts[0]['id']), data={'categories': [category['id']]}).ok
        assert ctx.request.delete(BASE + '/api/categories/' + str(category['id'])).status == 400
        # Native media drawers also offer files only, with no remote URL action.
        page.goto(BASE + '/admin/collections/media/create', wait_until='networkidle')
        assert page.locator('input[type=file]').count() > 0
        assert page.get_by_role('button', name='URL', exact=False).count() == 0
        for route in ['/admin/account', '/admin/collections/media', '/admin/collections/categories', '/admin/collections/redirects', '/admin/collections/activity']:
            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto(BASE + route, wait_until='networkidle')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), route
            page.screenshot(path=str(OUT / (route.split('/')[-1] + '-mobile.png')), full_page=True)
        assert not errors, errors
        # A separate user exercises profile and password changes without touching admin credentials.
        password = secrets.token_urlsafe(20)
        member_email = tag.lower() + '@example.invalid'
        created = ctx.request.post(BASE + '/api/users', data={'name': tag, 'email': member_email, 'password': password, 'role': 'atendimento', 'active': True})
        assert created.ok, created.text()
        member = browser.new_context(viewport={'width': 1440, 'height': 1000}, extra_http_headers={'Origin': BASE})
        assert member.request.post(BASE + '/api/users/login', data={'email': member_email, 'password': password}).ok
        profile = member.new_page()
        profile.on('dialog', lambda d: d.accept())
        profile.goto(BASE + '/admin/account', wait_until='networkidle')
        profile.get_by_label('Nome completo', exact=True).fill(tag + ' atualizado')
        profile.get_by_role('button', name='Salvar meus dados').click()
        expect(profile.get_by_role('status').filter(has_text='Seus dados foram atualizados.')).to_be_visible()
        assert member.request.get(BASE + '/api/users/me').json()['user']['name'] == tag + ' atualizado'
        next_password = secrets.token_urlsafe(22)
        profile.get_by_label('Nova senha', exact=True).fill(next_password)
        profile.get_by_label('Confirmar nova senha', exact=True).fill(next_password)
        profile.get_by_role('button', name='Atualizar senha').click()
        profile.wait_for_url(lambda u: '/admin/login' in u, timeout=30000)
        assert member.request.post(BASE + '/api/users/login', data={'email': member_email, 'password': password}).status == 401
        assert member.request.post(BASE + '/api/users/login', data={'email': member_email, 'password': next_password}).ok
        member.close()
        print('UI_V4_OK', tag, 'MEDIA_URL', media['url'], flush=True)
        browser.close()
