-- The plain-text copy of an issued temporary password (an elder's login, created when the
-- manager approves the family's intake application). The applicant family member reads it
-- from the application until the elder signs in and chooses their own password, which sets
-- it back to NULL. NULL for every account whose password the person chose.
ALTER TABLE app_user ADD COLUMN temporary_password VARCHAR(32) NULL;
