# Run Signal locally on Windows

## Terminal 1 — FastAPI

```powershell
cd "D:\PROJECTS\ACD\acdyon-signal-final\backend"
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell blocks activation, use the Command Prompt activation instead:

```cmd
venv\Scripts\activate.bat
```

## Terminal 2 — Frontend

```powershell
cd "D:\PROJECTS\ACD\acdyon-signal-final"
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

Do not run `python3` or `pip3` on Windows.
