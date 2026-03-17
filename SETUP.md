# Easy Setup Guide (No Tech Experience Needed)

This guide will walk you through every step to get the Ukrainian, Russian & German Typing Game running on your computer. Each step has screenshot-style descriptions so you know exactly what to click.

---

## What You Need to Install First

You need two free programs before the game will work. Think of these like installing a media player before you can watch a video - they run behind the scenes.

### Step 1: Install Node.js

Node.js is what runs the game in your browser.

1. Go to **https://nodejs.org/**
2. Click the big green button that says **"LTS"** (this is the recommended/stable version)
3. A file will download (something like `node-v22.x.x.msi`)
4. **Double-click** the downloaded file to open the installer
5. Click **"Next"** through all the screens - the default settings are fine
6. Click **"Install"**, then **"Finish"** when it's done

That's it for Node.js!

### Step 2: Install Python

Python is needed for the pronunciation feature (hearing words spoken out loud). The game still works without it, but you won't hear pronunciation.

1. Go to **https://www.python.org/downloads/**
2. Click the big yellow button that says **"Download Python 3.x.x"**
3. A file will download (something like `python-3.x.x.exe`)
4. **Double-click** the downloaded file to open the installer
5. **IMPORTANT: Check the box at the bottom that says "Add Python to PATH"** - this is the most common mistake people make. If you miss this, the game won't be able to find Python later.
6. Click **"Install Now"**
7. Click **"Close"** when it's done

That's it for Python!

---

## How to Download the Game

### Option A: Download as a ZIP file (easiest)

1. Go to **https://github.com/GryphonEDM/gryphons-ukrainian-russian-learning-app**
2. Click the green **"Code"** button near the top-right
3. Click **"Download ZIP"** from the dropdown menu
4. Once downloaded, find the ZIP file in your Downloads folder
5. **Right-click** the ZIP file and choose **"Extract All..."**
6. Choose where you want to put it (your Desktop is fine) and click **"Extract"**
7. You should now have a folder called something like `gryphons-ukrainian-russian-learning-app-main`

### Option B: Using Git (if you already have Git installed)

If you don't know what Git is, just use Option A above.

1. Open **Command Prompt** (press the Windows key, type `cmd`, and hit Enter)
2. Type the following and press Enter:
   ```
   git clone https://github.com/GryphonEDM/gryphons-ukrainian-russian-learning-app.git
   ```
3. The folder will appear in your user directory

---

## How to Start the Game

### On Windows (easiest method)

1. Open the game folder you downloaded
2. Find the file called **`start.bat`** - it might just show as **`start`** with a gear icon
3. **Double-click** `start.bat`
4. A black command window will appear - this is normal! It's setting everything up.
   - The first time you run it, it will install some things automatically. This can take a few minutes. Be patient!
   - You might see a Windows security popup asking "Do you want to allow this app to make changes?" - click **"Yes"**
5. When it's done, you'll see a message saying "Application Started Successfully!"
6. Two extra black windows will open - **don't close them!** They need to stay open while you use the game.
7. Open your web browser (Chrome, Firefox, Edge, etc.) and go to: **http://localhost:5173**
8. The game should appear! You're ready to play.

### When you're done playing

Close the two black command windows that were opened by `start.bat`. That shuts everything down cleanly.

### Next time you want to play

Just double-click `start.bat` again. It will be much faster the second time since everything is already installed.

---

## Troubleshooting (Common Problems)

### "Node.js is not installed" error when running start.bat

This means the installer from Step 1 didn't work correctly. Try:
1. **Restart your computer** after installing Node.js (this helps Windows find the new program)
2. Try running `start.bat` again

### "Python is not installed" error when running start.bat

This usually means you forgot to check **"Add Python to PATH"** in Step 2. To fix it:
1. Go to your Downloads folder and double-click the Python installer again
2. Click **"Modify"**
3. Click **"Next"**
4. Make sure **"Add Python to environment variables"** is checked
5. Click **"Install"**
6. **Restart your computer**
7. Try running `start.bat` again

### The game loads but I can't hear pronunciation

- This is normal on the very first run! The pronunciation models (~310 MB total, spread across 4 languages) download automatically. Check the black command window for download progress.
- If it still doesn't work after downloading, close everything and run `start.bat` again.

### The page says "This site can't be reached" in my browser

- Make sure the black command windows are still open (don't close them)
- Wait about 30 seconds and refresh the page
- Make sure you typed the address correctly: **http://localhost:5173**

### Windows Defender / antivirus blocks something

Some antivirus programs get nervous about new programs. The game is safe and open-source. If your antivirus blocks it:
1. Check the antivirus notification for an "Allow" or "Trust" option
2. Add the game folder to your antivirus exceptions list

### Everything is installed but nothing seems to happen when I double-click start.bat

- Right-click `start.bat` and choose **"Run as administrator"**
- If a window flashes and disappears immediately, there may be an error. Right-click `start.bat`, choose **"Edit"**, and add the word `pause` on its own line at the very end of the file. Save it and double-click again - now the window will stay open so you can read any error messages.

---

## Setting Up Your Keyboard for Typing

Once the game is running, you'll need to add a Ukrainian, Russian, or German keyboard to your computer so you can type in those languages. The game has a built-in **Keyboard Setup Guide** - look for it on the main screen.

The quick version for Windows:
1. Open **Settings** (press Windows key + I)
2. Go to **Time & Language** > **Language & Region**
3. Click **"Add a language"**
4. Search for **"Ukrainian"**, **"Russian"**, or **"German"** and add it
5. Now you can switch between keyboards by pressing **Win + Space**

---

## Still Stuck?

Report your issue at: **https://github.com/GryphonEDM/gryphons-ukrainian-russian-learning-app/issues**

Describe what happened and copy/paste any error messages from the black command window - that helps track down the problem much faster.
