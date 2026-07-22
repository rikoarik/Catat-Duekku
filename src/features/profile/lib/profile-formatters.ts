export function getProfileInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return 'CD';
}

export function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
}
