import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentDomain0000000000002 implements MigrationInterface {
  name = 'AppointmentDomain0000000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(`
      CREATE TABLE organizations (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE users (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), display_name text NOT NULL, role text NOT NULL CHECK (role IN ('admin','doctor','patient')), created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE clinics (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), name text NOT NULL, timezone text NOT NULL, address text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE doctors (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), display_name text NOT NULL, specialty text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE doctor_clinics (doctor_id uuid NOT NULL REFERENCES doctors(id), clinic_id uuid NOT NULL REFERENCES clinics(id), PRIMARY KEY (doctor_id, clinic_id));
      CREATE TABLE patients (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), scheduling_code text NOT NULL, display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id, scheduling_code));
      CREATE TABLE appointment_types (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), name text NOT NULL, duration_minutes integer NOT NULL CHECK (duration_minutes > 0), created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE doctor_availability (id uuid PRIMARY KEY, doctor_id uuid NOT NULL REFERENCES doctors(id), clinic_id uuid NOT NULL REFERENCES clinics(id), day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), start_time time NOT NULL, end_time time NOT NULL, CHECK (start_time < end_time));
      CREATE TABLE doctor_leave (id uuid PRIMARY KEY, doctor_id uuid NOT NULL REFERENCES doctors(id), start_at timestamptz NOT NULL, end_at timestamptz NOT NULL, reason text NOT NULL, CHECK (start_at < end_at));
      CREATE TABLE appointments (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), patient_id uuid NOT NULL REFERENCES patients(id), doctor_id uuid NOT NULL REFERENCES doctors(id), clinic_id uuid NOT NULL REFERENCES clinics(id), appointment_type_id uuid NOT NULL REFERENCES appointment_types(id), start_at timestamptz NOT NULL, end_at timestamptz NOT NULL, status text NOT NULL CHECK (status IN ('scheduled','completed','cancelled','no_show')), scheduling_note text, cancellation_reason text, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (start_at < end_at), CHECK (status <> 'cancelled' OR length(trim(cancellation_reason)) > 0));
      ALTER TABLE appointments ADD CONSTRAINT appointments_doctor_active_no_overlap EXCLUDE USING gist (doctor_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (status = 'scheduled');
      CREATE INDEX appointments_calendar_idx ON appointments (organization_id, start_at, end_at);
      CREATE TABLE audit_events (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), actor_id uuid NOT NULL REFERENCES users(id), action text NOT NULL, target_type text NOT NULL, target_id uuid NOT NULL, correlation_id text NOT NULL, workflow_id text, session_id text, run_id text, outcome text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE idempotency_records (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), actor_id uuid NOT NULL REFERENCES users(id), key text NOT NULL, action text NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (organization_id, actor_id, key, action));
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE idempotency_records, audit_events, appointments, doctor_leave, doctor_availability, appointment_types, patients, doctor_clinics, doctors, clinics, users, organizations CASCADE`);
  }
}
