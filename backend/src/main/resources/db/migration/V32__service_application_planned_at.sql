-- When a service application became fully planned: every activity it asked for is in a published
-- care plan version. That is still worked out from the plan versions (ServiceApplicationProgress);
-- this only records it once seen, so the manager's elder list can skip answered applications
-- instead of re-reading every elder's plans. Published versions never change, so once planned an
-- application stays planned. NULL means not seen planned yet, not that it isn't: rows from before
-- this column are checked from the plans as before.
ALTER TABLE care_service_application
    ADD COLUMN planned_at DATETIME(6) NULL COMMENT 'UTC; set once a published version covers everything it asked for';
