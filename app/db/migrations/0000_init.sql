-- Better Auth required tables
CREATE TABLE IF NOT EXISTS `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL UNIQUE,
  `email_verified` integer NOT NULL DEFAULT 0,
  `image` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `session` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `token` text NOT NULL UNIQUE,
  `expires_at` integer NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `account` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `id_token` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer,
  `updated_at` integer
);

-- Docship tables
CREATE TABLE IF NOT EXISTS `projects` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `slug` text NOT NULL UNIQUE,
  `name` text NOT NULL,
  `repo_owner` text NOT NULL,
  `repo_name` text NOT NULL,
  `docs_folder` text NOT NULL DEFAULT 'docs',
  `webhook_secret` text,
  `custom_domain` text,
  `is_private` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `doc_versions` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
  `tag` text NOT NULL,
  `status` text NOT NULL DEFAULT 'queued',
  `is_latest` integer NOT NULL DEFAULT 0,
  `error_details` text,
  `built_at` integer,
  `created_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `doc_pages` (
  `id` text PRIMARY KEY NOT NULL,
  `version_id` text NOT NULL REFERENCES `doc_versions`(`id`) ON DELETE CASCADE,
  `path` text NOT NULL,
  `title` text NOT NULL,
  `kv_key` text NOT NULL,
  `order_index` integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS `idx_projects_user_id` ON `projects`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_projects_slug` ON `projects`(`slug`);
CREATE INDEX IF NOT EXISTS `idx_doc_versions_project_id` ON `doc_versions`(`project_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_doc_versions_project_tag` ON `doc_versions`(`project_id`, `tag`);
CREATE INDEX IF NOT EXISTS `idx_doc_pages_version_id` ON `doc_pages`(`version_id`);
