import json
import os
import pathlib
import subprocess

project_ref = "pfpjffaptmojgrlibqzu"
token = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not token:
    raise SystemExit("SUPABASE_ACCESS_TOKEN belum diatur")

templates = pathlib.Path(__file__).parent
payload = {
    "mailer_subjects_confirmation": "Konfirmasi email Catat Duekku",
    "mailer_templates_confirmation_content": (templates / "confirm-signup.html").read_text(),
    "mailer_subjects_invite": "Undangan ke Catat Duekku",
    "mailer_templates_invite_content": (templates / "invite.html").read_text(),
    "mailer_subjects_magic_link": "Tautan masuk Catat Duekku",
    "mailer_templates_magic_link_content": (templates / "magic-link.html").read_text(),
    "mailer_subjects_recovery": "Atur ulang kata sandi Catat Duekku",
    "mailer_templates_recovery_content": (templates / "reset-password.html").read_text(),
    "mailer_subjects_email_change": "Konfirmasi perubahan email Catat Duekku",
    "mailer_templates_email_change_content": (templates / "change-email.html").read_text(),
    "mailer_subjects_reauthentication": "Kode verifikasi Catat Duekku",
    "mailer_templates_reauthentication_content": (templates / "reauthentication.html").read_text(),
    "mailer_subjects_password_changed_notification": "Kata sandi Catat Duekku telah diubah",
    "mailer_templates_password_changed_notification_content": (templates / "password-changed.html").read_text(),
    "mailer_notifications_password_changed_enabled": True,
    "mailer_subjects_email_changed_notification": "Email Catat Duekku telah diubah",
    "mailer_templates_email_changed_notification_content": (templates / "email-changed.html").read_text(),
    "mailer_notifications_email_changed_enabled": True,
    "mailer_subjects_phone_changed_notification": "Nomor telepon Catat Duekku telah diubah",
    "mailer_templates_phone_changed_notification_content": (templates / "phone-changed.html").read_text(),
    "mailer_notifications_phone_changed_enabled": True,
    "mailer_subjects_identity_linked_notification": "Metode masuk ditambahkan ke Catat Duekku",
    "mailer_templates_identity_linked_notification_content": (templates / "identity-linked.html").read_text(),
    "mailer_notifications_identity_linked_enabled": True,
    "mailer_subjects_identity_unlinked_notification": "Metode masuk dihapus dari Catat Duekku",
    "mailer_templates_identity_unlinked_notification_content": (templates / "identity-unlinked.html").read_text(),
    "mailer_notifications_identity_unlinked_enabled": True,
    "mailer_subjects_mfa_factor_enrolled_notification": "Verifikasi tambahan Catat Duekku diaktifkan",
    "mailer_templates_mfa_factor_enrolled_notification_content": (templates / "mfa-enrolled.html").read_text(),
    "mailer_notifications_mfa_factor_enrolled_enabled": True,
    "mailer_subjects_mfa_factor_unenrolled_notification": "Verifikasi tambahan Catat Duekku dihapus",
    "mailer_templates_mfa_factor_unenrolled_notification_content": (templates / "mfa-unenrolled.html").read_text(),
    "mailer_notifications_mfa_factor_unenrolled_enabled": True,
}
result = subprocess.run(
    [
        "curl",
        "--silent",
        "--show-error",
        "--fail-with-body",
        "--request",
        "PATCH",
        f"https://api.supabase.com/v1/projects/{project_ref}/config/auth",
        "--header",
        f"Authorization: Bearer {token}",
        "--header",
        "Content-Type: application/json",
        "--data-binary",
        "@-",
    ],
    input=json.dumps(payload),
    text=True,
    capture_output=True,
)
if result.returncode:
    raise SystemExit(f"Gagal menerapkan template: {result.stderr.strip()} {result.stdout.strip()}")
print("Semua template email Supabase berhasil diterapkan")
