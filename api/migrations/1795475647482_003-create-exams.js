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
  pgm.createTable("exams", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    patient_id: {
      type: "uuid",
      notNull: true,
      references: "patients",
      onDelete: "RESTRICT",
    },
    exam_type_id: {
      type: "uuid",
      notNull: true,
      references: "exam_types",
      onDelete: "RESTRICT",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "RECEIVED",
      check: "status IN ('RECEIVED', 'IN_ANALYSIS', 'REPORT_CHECKED', 'SENT')",
    },
    requested_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    created_by: {
      type: "uuid",
      notNull: false,
      references: "users",
      onDelete: "SET NULL",
    },
  });

  pgm.createIndex("exams", "status");
  pgm.createIndex("exams", "requested_at");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("exams");
};
