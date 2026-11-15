"""Integration checks for the isolated HS workspace. Never targets production."""
import json
import secrets
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'https://hs-admin-preview.70.38.101.106.sslip.io'
SITE = 'https://hs-site-preview.70.38.101.106.sslip.io'
OUT = Path(__file__).parent / 'output/playwright/workflows'

def verify(env):
    assert 'preview.' in BASE and 'preview.' in SITE
    OUT.mkdir(parents=True, exist_ok=True)
    tag = 'QA' + secrets.token_hex(3)
    with sync_playwright() as p:
        admin = p.request.new_context(base_url=BASE, extra_http_headers={'Origin': BASE})
        visitor = p.request.new_context(base_url=BASE, extra_http_headers={'Origin': BASE})
        site = p.request.new_context(base_url=SITE)
        login = admin.post('/api/users/login', data={'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']})
        assert login.ok, login.text()
        me = login.json()['user']
        def ok(r):
            assert r.ok, (r.status, r.text()[:700])
            return r.json()
        def denied(r):
            assert r.status in [400, 401, 403, 404, 409], (r.status, r.text()[:500])
        def person(role, permissions=None):
            password = secrets.token_urlsafe(20)
            email = tag.lower() + '-' + role + '-' + secrets.token_hex(2) + '@example.invalid'
            u = ok(admin.post('/api/users', data={'name': tag + ' ' + role, 'email': email, 'password': password, 'role': role, 'permissions': permissions or [], 'active': True}))['doc']
            session = p.request.new_context(base_url=BASE, extra_http_headers={'Origin': BASE})
            ok(session.post('/api/users/login', data={'email': email, 'password': password}))
            return u, session, password
        editor, edit, _ = person('editor')
        agent, staff, agent_password = person('atendimento')
        limited, draft, _ = person('personalizado', ['blog'])
        denied(visitor.get('/api/inbox'))
        denied(visitor.get('/api/quotes'))
        denied(admin.post('/api/quotes', data={'name': 'Manual', 'contact': 'no@example.invalid'}))
        denied(staff.post('/api/quotes', data={'name': 'Manual', 'contact': 'no@example.invalid'}))
        denied(edit.get('/api/inbox'))
        denied(staff.post('/api/globals/home', data={'hero': {'title': 'Nao permitido'}}))
        denied(staff.get('/api/activity'))
        denied(staff.post('/api/users', data={'name': 'X', 'email': 'x@example.invalid', 'password': secrets.token_urlsafe(18)}))
        # A field-level denial can return 200 while ignoring the forbidden fields.
        staff.patch('/api/users/' + str(agent['id']), data={'role': 'admin', 'permissions': ['site', 'export']})
        assert ok(admin.get('/api/users/' + str(agent['id'])))['role'] == 'atendimento'
        denied(staff.get('/api/users/' + str(me['id'])))
        denied(admin.patch('/api/users/' + str(me['id']), data={'active': False}))
        denied(admin.patch('/api/users/' + str(me['id']), data={'role': 'editor'}))
        denied(admin.delete('/api/users/' + str(me['id'])))
        denied(admin.post('/api/users', data={'name': 'Invalid permissions', 'email': tag+'-bad@example.invalid', 'password': secrets.token_urlsafe(18), 'role': 'personalizado', 'permissions': ['publish']}))
        print('PASS roles, API authorization, self-protection and privilege escalation', flush=True)

        qdata = {'name': tag + ' Cliente', 'contact': 'qa@example.invalid', 'service': 'Armazenagem', 'message': 'Pedido vindo do site, sem cadastro manual.'}
        ok(site.post('/api/quote', data=qdata))
        listing = ok(admin.get('/api/inbox', params={'search': tag}))
        assert listing['totalDocs'] == 1, listing
        q = listing['docs'][0]
        q = ok(admin.get('/api/quotes/' + str(q['id']) + '?depth=0'))
        assert q['status'] == 'novo' and q['source'] == 'site' and q['history']
        denied(admin.delete('/api/quotes/' + str(q['id'])))
        admin.patch('/api/quotes/' + str(q['id']), data={'name': 'Forged', 'contact': 'forged@example.invalid', 'history': []})
        preserved = ok(admin.get('/api/quotes/' + str(q['id']) + '?depth=0'))
        assert preserved['name'] == qdata['name'] and preserved['contact'] == qdata['contact'] and preserved['history']
        denied(admin.patch('/api/quotes/' + str(q['id']), data={'createdAt': '2020-01-01T12:00:00.000Z'}))
        denied(admin.patch('/api/quotes/' + str(q['id']), data={'assignedTo': editor['id']}))
        changed = ok(staff.patch('/api/quotes/' + str(q['id']) + '?depth=0', data={'status': 'em contato', 'assignedTo': agent['id'], 'priority': 'alta', 'followUp': '2026-01-01T12:00:00.000Z', 'notes': 'Retornar com proposta.', 'expectedUpdatedAt': preserved['updatedAt']}))['doc']
        assert len(changed['history']) >= 5
        denied(staff.patch('/api/quotes/' + str(q['id']), data={'status': 'fechado', 'expectedUpdatedAt': preserved['updatedAt']}))
        filtered = ok(staff.get('/api/inbox', params={'search': tag, 'status': 'em contato', 'owner': 'mine', 'priority': 'alta', 'service': 'Armazenagem', 'overdue': '1'}))
        assert filtered['totalDocs'] == 1
        assert ok(staff.get('/api/inbox', params={'search': tag, 'status': 'fechado'}))['totalDocs'] == 0
        denied(staff.get('/api/inbox?format=csv'))
        ok(site.post('/api/quote', data={**qdata, 'name': '=SUM(1+1)', 'message': tag}))
        export = admin.get('/api/inbox', params={'format': 'csv', 'search': tag})
        assert export.ok and "'=SUM(1+1)" in export.text()
        assert 'Cliente' in export.text() and qdata['contact'] in export.text()
        for i in range(21):
            fixture = ok(visitor.post('/api/quotes', headers={'x-quote-secret': env['QUOTE_PROXY_SECRET']}, data={**qdata, 'name': tag + ' pagina ' + str(i), 'status': 'fechado', 'notes': 'nao deve ser aceita'}))['doc']
            assert fixture['status'] == 'novo' and not fixture.get('notes')
        first = ok(admin.get('/api/inbox', params={'search': tag + ' pagina'}))
        second = ok(admin.get('/api/inbox', params={'search': tag + ' pagina', 'page': 2}))
        assert first['totalDocs'] == 21 and len(first['docs']) == 20 and first['hasNextPage']
        assert len(second['docs']) == 1 and not second['hasNextPage']
        print('PASS site intake, immutable client data, assignment, history, combined filters, conflicts and safe CSV', flush=True)

        content = {'root': {'type': 'root', 'version': 1, 'direction': 'ltr', 'format': '', 'indent': 0, 'children': [{'type': 'paragraph', 'version': 1, 'direction': 'ltr', 'format': '', 'indent': 0, 'children': [{'type': 'text', 'version': 1, 'detail': 0, 'format': 0, 'mode': 'normal', 'style': '', 'text': 'Informacoes sobre a operacao e armazenagem da HS Logistica.'}]}]}}
        post = ok(draft.post('/api/posts', data={'title': tag + ' Artigo', 'excerpt': 'Texto de teste', 'content': content, '_status': 'draft'}))['doc']
        denied(draft.patch('/api/posts/' + str(post['id']), data={'_status': 'published'}))
        denied(staff.post('/api/posts', data={'title': 'Nao permitido'}))
        ok(edit.patch('/api/posts/' + str(post['id']), data={'_status': 'published'}))
        denied(draft.patch('/api/posts/' + str(post['id']), data={'_status': 'draft'}))
        print('PASS separate draft and publication permissions', flush=True)

        home = ok(admin.get('/api/globals/home?depth=0'))
        settings = ok(admin.get('/api/globals/site-settings?depth=0'))
        img = ok(admin.post('/api/media', multipart={'_payload': json.dumps({'alt': tag + ' Logo'}), 'file': {'name': tag + '.png', 'mimeType': 'image/png', 'buffer': (Path(__file__).parent/'apps/cms/public/logo.png').read_bytes()}}))['doc']
        try:
            brand = {**settings['brand'], 'logo': img['id'], 'logoWidth': 125}
            ok(admin.post('/api/globals/site-settings', data={'brand': brand, 'navigation': {'configured': True, 'cta': tag + ' Cotar', 'items': [{'label': 'Nosso atendimento', 'target': 'contato'}]}, 'footer': tag + ' Rodape', 'expectedUpdatedAt': settings['updatedAt']}))
            denied(admin.delete('/api/media/' + str(img['id'])))
            ok(admin.post('/api/globals/home', data={'hero': {**home['hero'], 'title': tag + ' Logistica'}, 'sections': {**home['sections'], 'faq': False}, 'quoteForm': {**home['quoteForm'], 'successMessage': tag + ' Pedido recebido'}}))
            denied(admin.post('/api/globals/site-settings', data={'footer': 'Stale update', 'expectedUpdatedAt': settings['updatedAt']}))
            deadline = time.time() + 20
            while time.time() < deadline:
                html = site.get('/').text()
                if tag + ' Logistica' in html and tag + ' Rodape' in html:
                    break
                time.sleep(.5)
            assert tag + ' Logistica' in html and 'Nosso atendimento' in html
            assert img['filename'] in html and 'width="125"' in html
            assert 'id="duvidas"' not in html
            assert tag + ' Pedido recebido' in html
            print('PASS logo, navigation, section visibility, form texts, real web revalidation and media in-use protection', flush=True)
        finally:
            ok(admin.post('/api/globals/home', data={k: v for k, v in home.items() if k in ['hero', 'services', 'photos', 'where', 'steps', 'about', 'faq', 'quoteForm', 'sections', 'meta']}))
            ok(admin.post('/api/globals/site-settings', data={k: v for k, v in settings.items() if k in ['brand', 'navigation', 'theme', 'contact', 'footer', 'footerOptions', 'seo']}))

        # Deactivation and session revocation must invalidate already-issued sessions.
        ok(admin.patch('/api/users/' + str(agent['id']), data={'active': False}))
        denied(staff.get('/api/workspace'))
        denied(staff.post('/api/users/login', data={'email': agent['email'], 'password': agent_password}))
        ok(admin.patch('/api/users/' + str(agent['id']), data={'active': True}))
        ok(staff.post('/api/users/login', data={'email': agent['email'], 'password': agent_password}))
        ok(admin.post('/api/team/' + str(agent['id']) + '/revoke'))
        denied(staff.get('/api/workspace'))
        assert ok(admin.get('/api/activity?limit=1'))['totalDocs'] > 0
        print('PASS account deactivation, login blocking, session revocation and activity log', flush=True)

        for context in [admin, visitor, site, edit, staff, draft]: context.dispose()
    browser_checks(env)
    print('ALL WORKFLOW CHECKS PASSED', flush=True)

def browser_checks(env):
    OUT.mkdir(parents=True, exist_ok=True)
    tag = 'QAUI' + secrets.token_hex(3)
    with sync_playwright() as p:
        def ok(r):
            assert r.ok, (r.status, r.text()[:700])
            return r.json()
        admin = p.request.new_context(base_url=BASE, extra_http_headers={'Origin': BASE})
        ok(admin.post('/api/users/login', data={'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']}))
        settings = ok(admin.get('/api/globals/site-settings?depth=0'))
        agent_password = secrets.token_urlsafe(20)
        agent = ok(admin.post('/api/users', data={'name': tag+' atendimento', 'email':tag.lower()+'-agent@example.invalid', 'password':agent_password, 'role':'atendimento', 'active':True}))['doc']
        qdata = {'name': tag+' Cliente', 'contact':'qa@example.invalid','service':'Armazenagem','message':'Teste de interface'}
        visitor = p.request.new_context(base_url=BASE)
        ok(visitor.post('/api/quotes', headers={'x-quote-secret':env['QUOTE_PROXY_SECRET']}, data=qdata))
        img = ok(admin.post('/api/media', multipart={'_payload': json.dumps({'alt':tag+' Logo'}), 'file':{'name':tag+'.png','mimeType':'image/png','buffer':(Path(__file__).parent/'apps/cms/public/logo.png').read_bytes()}}))['doc']
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={'width': 1440, 'height': 1050})
        ok(ctx.request.post(BASE + '/api/users/login', data={'email': env['ADMIN_EMAIL'], 'password': env['ADMIN_PASSWORD']}))
        page = ctx.new_page(); errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE + '/admin/inbox', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Pedidos de cotação', exact=True)).to_be_visible()
        assert page.get_by_role('link', name='Criar Novo').count() == 0
        page.locator('#inbox-search').fill(qdata['name'])
        page.get_by_role('button', name='Aplicar filtros', exact=True).click()
        expect(page.locator('button.hs-row-link').filter(has_text=qdata['name'])).to_be_visible()
        page.screenshot(path=str(OUT/'inbox-desktop.png'), full_page=True)
        page.locator('button.hs-row-link').filter(has_text=qdata['name']).click()
        expect(page.get_by_role('dialog')).to_be_visible()
        page.get_by_role('dialog').get_by_role('combobox').first.select_option('fechado')
        page.get_by_role('button', name='Salvar atendimento', exact=True).click()
        expect(page.get_by_text('Atendimento atualizado.', exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/'quote-detail.png'), full_page=True)
        page.get_by_role('button', name='Fechar', exact=True).last.click()
        page.goto(BASE + '/admin/team', wait_until='networkidle')
        expect(page.get_by_role('heading', name='Equipe e permissões')).to_be_visible()
        page.screenshot(path=str(OUT/'team-desktop.png'), full_page=True)
        page.get_by_role('button', name='Adicionar pessoa', exact=True).click()
        dialog = page.get_by_role('dialog')
        ui_name = tag + ' Pessoa UI'
        dialog.get_by_label('Nome', exact=True).fill(ui_name)
        dialog.get_by_label('E-mail de acesso', exact=True).fill(tag.lower() + '-ui@example.invalid')
        dialog.locator('input[type=password]').fill(secrets.token_urlsafe(20))
        dialog.get_by_label('Perfil de acesso').select_option('personalizado')
        dialog.get_by_label('Atender pedidos de cotação', exact=True).check()
        dialog.get_by_role('button', name='Criar acesso', exact=True).click()
        expect(dialog).not_to_be_visible()
        expect(page.get_by_role('cell', name=ui_name, exact=False)).to_be_visible()
        page.goto(BASE + '/admin/site?section=header', wait_until='networkidle')
        expect(page.get_by_role('textbox', name='Nome da empresa', exact=True)).to_be_visible()
        page.get_by_role('textbox', name='Nome da empresa', exact=True).fill(settings['brand']['name'] + ' QA')
        page.get_by_role('button', name='Salvar alterações', exact=True).click()
        expect(page.get_by_text('Conteúdo salvo e publicação atualizada no site.', exact=True)).to_be_visible()
        page.get_by_role('textbox', name='Nome da empresa', exact=True).fill(settings['brand']['name'])
        page.get_by_role('button', name='Salvar alterações', exact=True).click()
        expect(page.get_by_text('Conteúdo salvo e publicação atualizada no site.', exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/'site-editor-desktop.png'), full_page=True)
        page.get_by_role('button', name='Selecionar imagem', exact=True).click()
        picker = page.get_by_role('dialog')
        picker.get_by_label('Buscar na biblioteca').fill(tag)
        expect(picker.locator('.hs-media-grid button').first).to_be_visible()
        picker.locator('.hs-media-grid button').first.click()
        expect(page.locator('.hs-image-field img')).to_be_visible()
        page.get_by_role('button', name='Salvar alterações', exact=True).click()
        expect(page.get_by_text('Conteúdo salvo e publicação atualizada no site.', exact=True)).to_be_visible()
        assert ok(admin.get('/api/globals/site-settings?depth=0'))['brand']['logo'] == img['id']
        ok(admin.post('/api/globals/site-settings', data={'brand': settings['brand']}))
        for route in ['collections/quotes', 'collections/users', 'collections/posts']:
            r = page.goto(BASE + '/admin/' + route, wait_until='networkidle')
            assert r.status == 200 and 'Application error' not in page.locator('body').inner_text()
        page.set_viewport_size({'width': 390, 'height': 844})
        for route, filename in [('inbox', 'inbox-mobile.png'), ('team', 'team-mobile.png'), ('site', 'site-editor-mobile.png')]:
            page.goto(BASE + '/admin/' + route, wait_until='networkidle')
            page.wait_for_function('document.documentElement.scrollWidth <= 390')
            page.screenshot(path=str(OUT/filename), full_page=True)
        # The public mobile navigation also works with editable links.
        page.goto(SITE, wait_until='networkidle')
        page.locator('.site-mobile-menu summary').click()
        expect(page.locator('.site-mobile-menu nav')).to_be_visible()
        page.locator('.site-mobile-menu a').first.click()
        assert page.locator('.site-mobile-menu').get_attribute('open') is None
        assert not errors, errors
        for account, password in [(agent, agent_password)]:
            restricted = browser.new_context(viewport={'width': 1440, 'height': 950})
            ok(restricted.request.post(BASE + '/api/users/login', data={'email': account['email'], 'password': password}))
            rpage = restricted.new_page()
            r = rpage.goto(BASE + '/admin', wait_until='networkidle')
            assert r.status == 200
            assert rpage.locator('a.hs-work-nav[href="/admin/site"]').count() == 0
            assert rpage.locator('a.hs-work-nav[href="/admin/team"]').count() == 0
            expect(rpage.locator('a.hs-work-nav[href="/admin/inbox"]')).to_be_visible()
            restricted.close()
        print('PASS browser inbox/detail saving, team, guided site editor, mobile widths and public mobile menu; no JS errors', flush=True)
        browser.close()
        admin.dispose(); visitor.dispose()
