# Existing installation-ஐ update செய்வது — v1.1

உங்கள் accounts மற்றும் applications ஏற்கனவே `data` folder-ல் உள்ளன. புதிய ZIP-ல் `data` folder சேர்க்கப்படவில்லை. Database migration தேவையில்லை.

1. Website server ஓடும் PowerShell-ல் `Ctrl + C` அழுத்தி server-ஐ நிறுத்துங்கள்.
2. இப்போது பயன்படுத்தும் `twin-care-platform` folder-ஐ முழுவதுமாக வேறு இடத்தில் backup copy எடுங்கள். அதில் `data` folder இருப்பதை உறுதிசெய்யுங்கள்.
3. புதிதாக download செய்த ZIP-ஐ **வேறு temporary folder**-ல் extract செய்யுங்கள்.
4. அந்த புதிய folder-ல் உள்ள `server.py` file மற்றும் `public` folder-ஐ மட்டும் உங்கள் பழைய `E:\twin-care-platform-v1\twin-care-platform` folder-க்குள் copy செய்து Replace தேர்வு செய்யுங்கள்.
5. பழைய `data` folder-ஐ delete, replace அல்லது move செய்ய வேண்டாம். Existing `.env` இருந்தால் அதையும் மாற்ற வேண்டாம்.
6. பழைய project folder-ல் PowerShell திறந்து இயக்குங்கள்:

```powershell
py -3.12 server.py
```

7. Browser-ல் `http://localhost:8000/` திறந்து `Ctrl + F5` அழுத்துங்கள்.
8. Admin panel-க்கு `http://localhost:8000/admin` திறக்கவும். உங்கள் existing admin email/password பயன்படுத்தவும்.

## வேறுபாடு

- `/` — patients, public, donors/supporters, volunteers.
- `/admin` — owners / authorized admins நிர்வகிக்கும் தனி workspace.
- Patient account-க்கு admin sign-in அனுமதி இல்லை.
- Public menu-ல் Admin button இல்லை.
- Admin பகுதியில் application review, documents, approvals, reports, volunteers, stories போன்ற management வசதிகள் இருக்கும்.
- ஏற்கனவே உள்ள database மற்றும் accounts தொடர்ந்து வேலை செய்யும். இரண்டு admin approvals கிடைத்த பின் **Publish case** அழுத்த வேண்டும்.

இந்த update தனித்தனி interfaces உருவாக்குகிறது; தனி domain அல்லது இரண்டு servers தேவையில்லை. ஒரே browser-ல் இரண்டு accounts-ஐ ஒரே நேரத்தில் test செய்ய, இரண்டாவது account-ஐ Incognito / Private window-ல் திறக்கவும்.

## சோதனை நிலை

14 backend tests மற்றும் இரண்டு portals-ன் JavaScript render checks pass செய்யப்பட்டுள்ளன. Browser screenshots / visual interaction testing இந்த environment-ல் செய்யப்படவில்லை. Update செய்த பிறகு உங்கள் computer-ல் patient submission மற்றும் admin approval flow-ஐச் சோதியுங்கள்.
