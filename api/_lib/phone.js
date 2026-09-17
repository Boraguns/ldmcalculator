// Phone validation shared by sign-up and profile updates. Formats vary by
// country ("+90 532 123 45 67", "(0532) 123-4567"), so only the digit count
// is checked: 10–15 digits covers national and E.164 international numbers.
export function checkPhone(raw) {
    const phone = String(raw || '').trim().slice(0, 40);
    if (!phone) return { error: 'phone_required' };
    const digits = phone.replace(/\D/g, '').length;
    if (digits < 10 || digits > 15 || /[^\d\s+().-]/.test(phone)) return { error: 'invalid_phone' };
    return { phone };
}
