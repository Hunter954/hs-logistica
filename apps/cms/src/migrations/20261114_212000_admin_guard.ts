import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Serialize concurrent removals/demotions so two requests cannot remove every admin.
  await db.execute(sql`
    CREATE FUNCTION hs_keep_active_admin() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.role = 'admin' AND COALESCE(OLD.active, true)
        AND (TG_OP = 'DELETE' OR NEW.role <> 'admin' OR NOT COALESCE(NEW.active, true)) THEN
        PERFORM pg_advisory_xact_lock(95461114);
        IF NOT EXISTS (SELECT 1 FROM users WHERE id <> OLD.id AND role = 'admin' AND COALESCE(active, true)) THEN
          RAISE EXCEPTION 'Mantenha pelo menos um administrador ativo.';
        END IF;
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER hs_keep_active_admin BEFORE UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION hs_keep_active_admin();
  `)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TRIGGER IF EXISTS hs_keep_active_admin ON users; DROP FUNCTION IF EXISTS hs_keep_active_admin();`)
}
