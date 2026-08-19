# Receipt retention

`RECEIPT_RETENTION_DAYS` must be between 14 and 30. Default 21.

`receipts.retain_until` is set at upload. `/api/cron/retention` deletes the private object and marks `deleted_at` unless `disputed` is true. Price observations are not deleted.
