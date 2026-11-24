/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable("exam_status_history", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    exam_id: {
      type: "uuid",
      notNull: true,
      references: "exams",
      onDelete: "CASCADE",
    },
    from_status: {
      type: "varchar(20)",
      notNull: false,
      check: "from_status IN ('RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT')",
    },
    to_status: {
      type: "varchar(20)",
      notNull: true,
      check: "to_status IN ('RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT')",
    },
    changed_by: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "RESTRICT",
    },
    changed_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.addConstraint("exam_status_history", "valid_status_transition", {
    check: "from_status IS NULL OR from_status != to_status",
  });

  pgm.createIndex("exam_status_history", "exam_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("exam_status_history");
};
