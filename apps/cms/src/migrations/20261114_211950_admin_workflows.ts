import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_quotes_priority" AS ENUM('normal', 'alta');
  CREATE TYPE "public"."enum_users_permissions" AS ENUM('site', 'brand', 'blog', 'publish', 'media', 'quotes', 'export');
  CREATE TYPE "public"."enum_site_settings_navigation_items_target" AS ENUM('servicos', 'localizacao', 'etapas', 'empresa', 'blog', 'duvidas', 'contato');
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'atendimento';
  ALTER TYPE "public"."enum_users_role" ADD VALUE 'personalizado';
  CREATE TABLE "users_permissions" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_permissions",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "activity" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer,
  	"area" varchar NOT NULL,
  	"action" varchar NOT NULL,
  	"target" varchar,
  	"summary" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"target" "enum_site_settings_navigation_items_target" NOT NULL
  );
  
  ALTER TABLE "quotes" ADD COLUMN "priority" "enum_quotes_priority" DEFAULT 'normal';
  ALTER TABLE "quotes" ADD COLUMN "assigned_to_id" integer;
  ALTER TABLE "quotes" ADD COLUMN "follow_up" timestamp(3) with time zone;
  ALTER TABLE "quotes" ADD COLUMN "source" varchar DEFAULT 'site';
  ALTER TABLE "quotes" ADD COLUMN "history" jsonb;
  ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "activity_id" integer;
  ALTER TABLE "home" ADD COLUMN "quote_form_title" varchar DEFAULT 'Cotação de armazenagem e transporte';
  ALTER TABLE "home" ADD COLUMN "quote_form_sub" varchar DEFAULT 'Conte o que precisa guardar ou movimentar. Respondemos com uma proposta.';
  ALTER TABLE "home" ADD COLUMN "quote_form_button" varchar DEFAULT 'Enviar pedido de cotação';
  ALTER TABLE "home" ADD COLUMN "quote_form_message_placeholder" varchar DEFAULT 'Produto, volume e prazo';
  ALTER TABLE "home" ADD COLUMN "quote_form_success_message" varchar DEFAULT 'Pedido de cotação recebido. Entraremos em contato.';
  ALTER TABLE "home" ADD COLUMN "sections_services" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_photos" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_where" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_steps" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_about" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_blog" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_faq" boolean DEFAULT true;
  ALTER TABLE "home" ADD COLUMN "sections_blog_title" varchar DEFAULT 'Do blog';
  ALTER TABLE "home" ADD COLUMN "sections_blog_link" varchar DEFAULT 'Ver todos os posts';
  ALTER TABLE "site_settings" ADD COLUMN "brand_logo_width" numeric DEFAULT 77;
  ALTER TABLE "site_settings" ADD COLUMN "brand_show_name" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "navigation_configured" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "navigation_cta" varchar DEFAULT 'Pedir cotação';
  ALTER TABLE "site_settings" ADD COLUMN "footer_options_show_admin_link" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "footer_options_admin_label" varchar DEFAULT 'Área do cliente';
  ALTER TABLE "users_permissions" ADD CONSTRAINT "users_permissions_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_navigation_items" ADD CONSTRAINT "site_settings_navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_permissions_order_idx" ON "users_permissions" USING btree ("order");
  CREATE INDEX "users_permissions_parent_idx" ON "users_permissions" USING btree ("parent_id");
  CREATE INDEX "activity_actor_idx" ON "activity" USING btree ("actor_id");
  CREATE INDEX "activity_updated_at_idx" ON "activity" USING btree ("updated_at");
  CREATE INDEX "activity_created_at_idx" ON "activity" USING btree ("created_at");
  CREATE INDEX "site_settings_navigation_items_order_idx" ON "site_settings_navigation_items" USING btree ("_order");
  CREATE INDEX "site_settings_navigation_items_parent_id_idx" ON "site_settings_navigation_items" USING btree ("_parent_id");
  ALTER TABLE "quotes" ADD CONSTRAINT "quotes_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_activity_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quotes_assigned_to_idx" ON "quotes" USING btree ("assigned_to_id");
  CREATE INDEX "users_active_idx" ON "users" USING btree ("active");
  CREATE INDEX "payload_locked_documents_rels_activity_id_idx" ON "payload_locked_documents_rels" USING btree ("activity_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_permissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "activity" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_navigation_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_permissions" CASCADE;
  DROP TABLE "activity" CASCADE;
  DROP TABLE "site_settings_navigation_items" CASCADE;
  ALTER TABLE "quotes" DROP CONSTRAINT "quotes_assigned_to_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_activity_fk";
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::text;
  DROP TYPE "public"."enum_users_role";
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor'::"public"."enum_users_role";
  ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."enum_users_role" USING "role"::"public"."enum_users_role";
  DROP INDEX "quotes_assigned_to_idx";
  DROP INDEX "users_active_idx";
  DROP INDEX "payload_locked_documents_rels_activity_id_idx";
  ALTER TABLE "quotes" DROP COLUMN "priority";
  ALTER TABLE "quotes" DROP COLUMN "assigned_to_id";
  ALTER TABLE "quotes" DROP COLUMN "follow_up";
  ALTER TABLE "quotes" DROP COLUMN "source";
  ALTER TABLE "quotes" DROP COLUMN "history";
  ALTER TABLE "users" DROP COLUMN "active";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "activity_id";
  ALTER TABLE "home" DROP COLUMN "quote_form_title";
  ALTER TABLE "home" DROP COLUMN "quote_form_sub";
  ALTER TABLE "home" DROP COLUMN "quote_form_button";
  ALTER TABLE "home" DROP COLUMN "quote_form_message_placeholder";
  ALTER TABLE "home" DROP COLUMN "quote_form_success_message";
  ALTER TABLE "home" DROP COLUMN "sections_services";
  ALTER TABLE "home" DROP COLUMN "sections_photos";
  ALTER TABLE "home" DROP COLUMN "sections_where";
  ALTER TABLE "home" DROP COLUMN "sections_steps";
  ALTER TABLE "home" DROP COLUMN "sections_about";
  ALTER TABLE "home" DROP COLUMN "sections_blog";
  ALTER TABLE "home" DROP COLUMN "sections_faq";
  ALTER TABLE "home" DROP COLUMN "sections_blog_title";
  ALTER TABLE "home" DROP COLUMN "sections_blog_link";
  ALTER TABLE "site_settings" DROP COLUMN "brand_logo_width";
  ALTER TABLE "site_settings" DROP COLUMN "brand_show_name";
  ALTER TABLE "site_settings" DROP COLUMN "navigation_configured";
  ALTER TABLE "site_settings" DROP COLUMN "navigation_cta";
  ALTER TABLE "site_settings" DROP COLUMN "footer_options_show_admin_link";
  ALTER TABLE "site_settings" DROP COLUMN "footer_options_admin_label";
  DROP TYPE "public"."enum_quotes_priority";
  DROP TYPE "public"."enum_users_permissions";
  DROP TYPE "public"."enum_site_settings_navigation_items_target";`)
}
