# Fajees — Twin Care platform-ஐ எப்படி இயக்குவது?

இது பழைய demo HTML மட்டும் அல்ல. Frontend + Python backend + SQLite database + private document storage + deployment setup சேர்ந்த project.

## உங்கள் computer-ல் முதலில் இயக்கவும்

1. ZIP-ஐ extract செய்யுங்கள்.
2. Python 3.12 அல்லது புதிய version நிறுவியிருக்க வேண்டும்.
3. `twin-care-platform` folder-ல் Terminal திறக்கவும்.
4. `python server.py` இயக்கவும்.
5. Browser-ல் `http://localhost:8000` திறக்கவும்.

முதல் முறை database காலியாக இருக்கும். Fake patients அல்லது donation amounts காட்டப்படாது. நீங்கள் submit செய்யும் விண்ணப்பங்கள் save ஆகும்.

## இரண்டு admin accounts

வேறு Terminal-ல் கீழே உள்ள commands-ஐ இயக்கவும். Example email/name-களை உண்மையான இரண்டு admins-ன் விவரங்களாக மாற்றவும்.

```sh
python manage.py create-admin first-admin@example.org --name "First Admin"
python manage.py create-admin second-admin@example.org --name "Second Admin"
```

ஒவ்வொரு command-மும் password கேட்கும். குறைந்தது 12 characters பயன்படுத்துங்கள். Password terminal-ல் தெரியாமல் இருப்பது இயல்பு.

ஒரு admin மட்டும் approve செய்தால் case public ஆகாது. இரண்டாவது admin approve செய்த பின், review screen-ல் **Publish case** அழுத்தினால் பொதுவில் வெளியாகும். Mockup-ல் இருந்த Admin A/B switch இங்கே கிடையாது.

## என்ன வேலை செய்கிறது?

- Register / login / logout / password change.
- Application submit; மூன்று documents private-ஆக upload.
- My applications-ல் status பார்க்கலாம்.
- Admin verification, rejection, two-admin approval, suspension.
- Verified case search; WhatsApp / call connection.
- Volunteer registration, fraud reports, admin success stories.
- Hospital/family-க்கு நேரடியாக வழங்கப்பட்ட உதவியை admin receipt பார்த்து பதிவு செய்யலாம்.

Twin Care பணம் வசூலிக்காது. Payment gateway இல்லை. போலியான foundation bank details நீக்கப்பட்டுள்ளன.

## Internet-ல் publish செய்ய என்ன வேண்டும்?

Hosting இன்னும் தேர்வு செய்யாததால் Docker-based setup கொடுத்துள்ளேன். Docker + persistent storage ஆதரிக்கும் server மற்றும் domain தேவை. Static HTML upload மட்டும் போதாது.

`README.md`-ல் deployment commands உள்ளன. `.env` file உருவாக்கி `DOMAIN` மற்றும் `CONTACT_EMAIL` values நிரப்ப வேண்டும். இரண்டு admin accounts உருவாக்க வேண்டும். Hosting வாங்கும் முன் இந்த project Python/Docker backend பயன்படுத்துகிறது என்பதை hosting provider-க்கு தெரிவிக்கவும்.

## இன்னும் செய்ய வேண்டியவை

- உண்மையான domain/hosting இணைத்தல், HTTPS இயக்குதல்.
- Foundation contact email மற்றும் data retention நடைமுறை முடிவு செய்தல்.
- Mobile/desktop browser-ல் முழு flow சோதித்தல்.
- Real medical data பயன்படுத்தும் முன் encrypted storage/backup மற்றும் staff access அமைத்தல்.

Email OTP/verification, automatic email notifications, email password-reset, MFA இப்போது சேர்க்கப்படவில்லை. Password recovery server owner மூலம் செய்யலாம். இந்த files கொடுத்ததால் மட்டும் website ஏற்கனவே internet-ல் publish ஆகிவிட்டது என்று அர்த்தமில்லை. முந்தைய ChatGPT-hosted link பழைய demo-தான்.

## Public / Admin தனித்தனி பகுதிகள்

Public மற்றும் patients: `http://localhost:8000/`

Owners மற்றும் admins: `http://localhost:8000/admin`

Public menu-ல் Admin link கிடையாது. Admin URL-ஐ நேரடியாகத் திறந்து ஏற்கனவே உருவாக்கிய admin email/password மூலம் login செய்யுங்கள். Patients-க்கு இந்தப் பகுதியில் access இல்லை.

இரண்டும் ஒரே browser session பயன்படுத்தும். Patient/admin-ஐ ஒரே நேரத்தில் test செய்ய இரண்டு browser profiles அல்லது private window பயன்படுத்துங்கள். Existing setup-ஐ update செய்ய `UPDATE-TA.md` படிக்கவும்.
