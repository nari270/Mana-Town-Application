BEGIN;

CREATE TYPE "UserRole_new" AS ENUM ('CUSTOMER', 'BUSINESS_OWNER', 'ADMIN');

DELETE FROM public.user_roles AS old_role
USING public.user_roles AS kept_role
WHERE old_role.user_id = kept_role.user_id
  AND old_role.role = 'WOMEN_ENTREPRENEUR'
  AND kept_role.role = 'BUSINESS_OWNER';

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE "UserRole_new"
  USING (
    CASE role::text
      WHEN 'RESIDENT' THEN 'CUSTOMER'
      WHEN 'WOMEN_ENTREPRENEUR' THEN 'BUSINESS_OWNER'
      ELSE role::text
    END
  )::"UserRole_new";
ALTER TYPE public."UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE public."UserRole_old";

DROP INDEX public.users_username_key;
ALTER TABLE public.users
  DROP COLUMN password_hash,
  DROP COLUMN username,
  ADD COLUMN auth_user_id UUID,
  ADD CONSTRAINT users_auth_user_id_fkey
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX users_auth_user_id_key ON public.users(auth_user_id);
ALTER TABLE public.access_logs ALTER COLUMN username TYPE VARCHAR(254);
ALTER TABLE public.businesses
  ADD COLUMN created_by_auth_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

DO $block$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', item.tablename);
  END LOOP;
END
$block$;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.current_app_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT u.id
  FROM public.users AS u
  WHERE u.auth_user_id = (SELECT auth.uid())
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION app_private.has_app_role(required_role public."UserRole")
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users AS u
    JOIN public.user_roles AS r ON r.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND r.role = required_role
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.owns_business(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_ownerships AS o
    JOIN public.users AS u ON u.id = o.user_id
    WHERE o.business_id = target_business_id
      AND u.auth_user_id = (SELECT auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.is_business_creator(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses AS b
    WHERE b.id = target_business_id
      AND b.created_by_auth_user_id = (SELECT auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.owns_issue(target_issue_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.issue_reports AS i
    JOIN public.users AS u ON u.id = i.reporter_id
    WHERE i.id = target_issue_id
      AND u.auth_user_id = (SELECT auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.is_public_ad(target_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.advertisement_campaigns AS c
    LEFT JOIN public.businesses AS b ON b.id = c.business_id
    WHERE c.id = target_campaign_id
      AND c.status = 'ACTIVE'
      AND c.starts_at <= pg_catalog.now()
      AND c.ends_at >= pg_catalog.now()
      AND (c.business_id IS NULL OR b.status = 'APPROVED')
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.is_public_ad_business(target_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.advertisement_campaigns AS c
    JOIN public.businesses AS b ON b.id = c.business_id
    WHERE c.business_id = target_business_id
      AND c.status = 'ACTIVE'
      AND c.starts_at <= pg_catalog.now()
      AND c.ends_at >= pg_catalog.now()
      AND b.status = 'APPROVED'
  )
$function$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_app_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_app_role(public."UserRole") TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.owns_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_business_creator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.owns_issue(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_public_ad(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_public_ad_business(UUID) TO authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.advertisement_campaigns, public.advertisement_assets TO anon;
GRANT INSERT ON public.advertisement_events TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

CREATE POLICY users_select_self_or_admin ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()) OR app_private.has_app_role('ADMIN'));
CREATE POLICY users_insert_self ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

CREATE POLICY profiles_select_self_or_admin ON public.user_profiles
  FOR SELECT TO authenticated
  USING (user_id = app_private.current_app_user_id() OR app_private.has_app_role('ADMIN'));
CREATE POLICY profiles_insert_self ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = app_private.current_app_user_id());
CREATE POLICY profiles_update_self ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = app_private.current_app_user_id())
  WITH CHECK (user_id = app_private.current_app_user_id());
CREATE POLICY profiles_delete_self_or_admin ON public.user_profiles
  FOR DELETE TO authenticated
  USING (user_id = app_private.current_app_user_id() OR app_private.has_app_role('ADMIN'));

CREATE POLICY user_roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = app_private.current_app_user_id() OR app_private.has_app_role('ADMIN'));
CREATE POLICY user_roles_insert_self_customer_or_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.has_app_role('ADMIN')
    OR (user_id = app_private.current_app_user_id() AND role = 'CUSTOMER')
  );
CREATE POLICY user_roles_update_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY user_roles_delete_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (app_private.has_app_role('ADMIN'));

CREATE POLICY categories_select_authenticated ON public.business_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY categories_insert_admin ON public.business_categories
  FOR INSERT TO authenticated WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY categories_update_admin ON public.business_categories
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY categories_delete_admin ON public.business_categories
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY businesses_select_approved_owner_admin ON public.businesses
  FOR SELECT TO authenticated
  USING (
    (status = 'APPROVED' AND (
      (SELECT auth.uid()) IS NOT NULL
      OR app_private.is_public_ad_business(id)
    ))
    OR app_private.owns_business(id)
    OR app_private.has_app_role('ADMIN')
  );
CREATE POLICY businesses_insert_owner_or_admin ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.has_app_role('ADMIN')
    OR (
      created_by_auth_user_id = (SELECT auth.uid())
      AND app_private.has_app_role('BUSINESS_OWNER')
    )
  );
CREATE POLICY businesses_update_owner_or_admin ON public.businesses
  FOR UPDATE TO authenticated
  USING (app_private.owns_business(id) OR app_private.has_app_role('ADMIN'))
  WITH CHECK (
    app_private.has_app_role('ADMIN')
    OR (
      app_private.owns_business(id)
      AND (
        created_by_auth_user_id IS NULL
        OR created_by_auth_user_id = (SELECT auth.uid())
      )
      AND status IN ('DRAFT', 'PENDING', 'REJECTED')
    )
  );
CREATE POLICY businesses_delete_admin ON public.businesses
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY ownerships_select_self_or_admin ON public.business_ownerships
  FOR SELECT TO authenticated
  USING (user_id = app_private.current_app_user_id() OR app_private.has_app_role('ADMIN'));
CREATE POLICY ownerships_insert_creator_or_admin ON public.business_ownerships
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.has_app_role('ADMIN')
    OR (
      user_id = app_private.current_app_user_id()
      AND app_private.is_business_creator(business_id)
    )
  );
CREATE POLICY ownerships_update_admin ON public.business_ownerships
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY ownerships_delete_admin ON public.business_ownerships
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY business_category_assignments_select ON public.business_category_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses AS b
      WHERE b.id = business_id
        AND (
          ((SELECT auth.uid()) IS NOT NULL AND b.status = 'APPROVED')
          OR app_private.is_public_ad_business(b.id)
          OR app_private.owns_business(b.id)
          OR app_private.is_business_creator(b.id)
          OR app_private.has_app_role('ADMIN')
        )
    )
  );
CREATE POLICY business_category_assignments_insert ON public.business_category_assignments
  FOR INSERT TO authenticated
  WITH CHECK (app_private.owns_business(business_id) OR app_private.is_business_creator(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_category_assignments_update ON public.business_category_assignments
  FOR UPDATE TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_category_assignments_delete ON public.business_category_assignments
  FOR DELETE TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));

CREATE POLICY business_images_select ON public.business_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses AS b
      WHERE b.id = business_id
        AND (
          ((SELECT auth.uid()) IS NOT NULL AND b.status = 'APPROVED')
          OR app_private.is_public_ad_business(b.id)
          OR app_private.owns_business(b.id)
          OR app_private.is_business_creator(b.id)
          OR app_private.has_app_role('ADMIN')
        )
    )
  );
CREATE POLICY business_images_insert ON public.business_images
  FOR INSERT TO authenticated
  WITH CHECK (app_private.owns_business(business_id) OR app_private.is_business_creator(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_images_update ON public.business_images
  FOR UPDATE TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_images_delete ON public.business_images
  FOR DELETE TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));

CREATE POLICY business_hours_select ON public.business_hours
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses AS b
      WHERE b.id = business_id
        AND (
          ((SELECT auth.uid()) IS NOT NULL AND b.status = 'APPROVED')
          OR app_private.is_public_ad_business(b.id)
          OR app_private.owns_business(b.id)
          OR app_private.is_business_creator(b.id)
          OR app_private.has_app_role('ADMIN')
        )
    )
  );
CREATE POLICY business_hours_insert ON public.business_hours
  FOR INSERT TO authenticated
  WITH CHECK (app_private.owns_business(business_id) OR app_private.is_business_creator(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_hours_update ON public.business_hours
  FOR UPDATE TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_hours_delete ON public.business_hours
  FOR DELETE TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));

CREATE POLICY business_moderation_select ON public.business_moderation_history
  FOR SELECT TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_moderation_insert ON public.business_moderation_history
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.has_app_role('ADMIN')
    OR (actor_id = app_private.current_app_user_id() AND app_private.owns_business(business_id))
  );
CREATE POLICY business_moderation_update_admin ON public.business_moderation_history
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY business_moderation_delete_admin ON public.business_moderation_history
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY entrepreneur_classifications_select ON public.entrepreneur_classifications
  FOR SELECT TO authenticated
  USING (
    status = 'APPROVED'
    OR requester_id = app_private.current_app_user_id()
    OR app_private.has_app_role('ADMIN')
  );
CREATE POLICY entrepreneur_classifications_insert_owner ON public.entrepreneur_classifications
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = app_private.current_app_user_id()
    AND app_private.owns_business(business_id)
    AND status = 'PENDING'
    AND reviewed_by IS NULL
  );
CREATE POLICY entrepreneur_classifications_update_owner_or_admin ON public.entrepreneur_classifications
  FOR UPDATE TO authenticated
  USING (
    requester_id = app_private.current_app_user_id()
    OR app_private.has_app_role('ADMIN')
  )
  WITH CHECK (
    app_private.has_app_role('ADMIN')
    OR (
      requester_id = app_private.current_app_user_id()
      AND app_private.owns_business(business_id)
      AND status = 'PENDING'
      AND reviewed_by IS NULL
    )
  );
CREATE POLICY entrepreneur_classifications_delete_admin ON public.entrepreneur_classifications
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY issue_reports_select_reporter_admin ON public.issue_reports
  FOR SELECT TO authenticated
  USING (reporter_id = app_private.current_app_user_id() OR app_private.has_app_role('ADMIN'));
CREATE POLICY issue_reports_insert_reporter ON public.issue_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = app_private.current_app_user_id());
CREATE POLICY issue_reports_update_admin ON public.issue_reports
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY issue_reports_delete_admin ON public.issue_reports
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY issue_attachments_select_reporter_admin ON public.issue_attachments
  FOR SELECT TO authenticated
  USING (app_private.owns_issue(issue_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY issue_attachments_insert_reporter_admin ON public.issue_attachments
  FOR INSERT TO authenticated
  WITH CHECK (app_private.owns_issue(issue_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY issue_attachments_update_admin ON public.issue_attachments
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY issue_attachments_delete_reporter_admin ON public.issue_attachments
  FOR DELETE TO authenticated
  USING (app_private.owns_issue(issue_id) OR app_private.has_app_role('ADMIN'));

CREATE POLICY issue_status_history_select_reporter_admin ON public.issue_status_history
  FOR SELECT TO authenticated
  USING (app_private.owns_issue(issue_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY issue_status_history_insert_admin ON public.issue_status_history
  FOR INSERT TO authenticated WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY issue_status_history_update_admin ON public.issue_status_history
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY issue_status_history_delete_admin ON public.issue_status_history
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY issue_internal_notes_admin ON public.issue_internal_notes
  FOR ALL TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));

CREATE POLICY advertisement_campaigns_select_public_or_admin ON public.advertisement_campaigns
  FOR SELECT TO anon, authenticated
  USING (
    app_private.is_public_ad(id)
    OR app_private.has_app_role('ADMIN')
  );
CREATE POLICY advertisement_campaigns_insert_admin ON public.advertisement_campaigns
  FOR INSERT TO authenticated WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY advertisement_campaigns_update_admin ON public.advertisement_campaigns
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY advertisement_campaigns_delete_admin ON public.advertisement_campaigns
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY advertisement_assets_select_public_or_admin ON public.advertisement_assets
  FOR SELECT TO anon, authenticated
  USING (
    app_private.is_public_ad(campaign_id)
    OR app_private.has_app_role('ADMIN')
  );
CREATE POLICY advertisement_assets_insert_admin ON public.advertisement_assets
  FOR INSERT TO authenticated WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY advertisement_assets_update_admin ON public.advertisement_assets
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY advertisement_assets_delete_admin ON public.advertisement_assets
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY advertisement_events_insert_eligible ON public.advertisement_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (app_private.is_public_ad(campaign_id));
CREATE POLICY advertisement_events_select_admin ON public.advertisement_events
  FOR SELECT TO authenticated USING (app_private.has_app_role('ADMIN'));
CREATE POLICY advertisement_events_update_admin ON public.advertisement_events
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY advertisement_events_delete_admin ON public.advertisement_events
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated USING (app_private.has_app_role('ADMIN'));
CREATE POLICY audit_logs_insert_self ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = app_private.current_app_user_id());
CREATE POLICY audit_logs_update_admin ON public.audit_logs
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY audit_logs_delete_admin ON public.audit_logs
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY access_logs_select_admin ON public.access_logs
  FOR SELECT TO authenticated USING (app_private.has_app_role('ADMIN'));
CREATE POLICY access_logs_update_admin ON public.access_logs
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY access_logs_delete_admin ON public.access_logs
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));
CREATE POLICY business_views_select_owner_admin ON public.business_views
  FOR SELECT TO authenticated
  USING (app_private.owns_business(business_id) OR app_private.has_app_role('ADMIN'));
CREATE POLICY business_views_insert_self ON public.business_views
  FOR INSERT TO authenticated
  WITH CHECK (
    viewer_id = app_private.current_app_user_id()
    AND EXISTS (
      SELECT 1 FROM public.businesses AS b
      WHERE b.id = business_id AND b.status = 'APPROVED'
    )
  );
CREATE POLICY business_views_update_admin ON public.business_views
  FOR UPDATE TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY business_views_delete_admin ON public.business_views
  FOR DELETE TO authenticated USING (app_private.has_app_role('ADMIN'));

CREATE POLICY app_configuration_admin ON public.app_configuration
  FOR ALL TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));
CREATE POLICY feature_flags_admin ON public.feature_flags
  FOR ALL TO authenticated
  USING (app_private.has_app_role('ADMIN'))
  WITH CHECK (app_private.has_app_role('ADMIN'));

COMMIT;
