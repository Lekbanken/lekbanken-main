

███████╗  ██████╗  ██████╗  ███╗   ███╗  ██████╗   ██████╗  ██╗ ██╗   ██╗ ███████╗ ██████╗ 
██╔════╝ ██╔═══██╗ ██╔══██╗ ████╗ ████║ ██╔═══██╗ ██╔════╝  ██║ ██║   ██║ ██╔════╝ ██╔══██╗
█████╗   ██║   ██║ ██████╔╝ ██╔████╔██║ ██║   ██║ ██║  ███╗ ██║ ██║   ██║ █████╗   ██████╔╝
██╔══╝   ██║   ██║ ██╔══██╗ ██║╚██╔╝██║ ██║   ██║ ██║   ██║ ██║ ╚██╗ ██╔╝ ██╔══╝   ██╔══██╗
██║      ╚██████╔╝ ██║  ██║ ██║ ╚═╝ ██║ ╚██████╔╝ ╚██████╔╝ ██║  ╚████╔╝  ███████╗ ██║  ██║
╚═╝       ╚═════╝  ╚═╝  ╚═╝ ╚═╝     ╚═╝  ╚═════╝   ╚═════╝  ╚═╝   ╚═══╝   ╚══════╝ ╚═╝  ╚═╝

# ============================================================

# ██╗      ███████╗ ██╗  ██╗ ██████╗   █████╗  ███╗   ██╗ ██╗  ██╗ ███████╗ ███╗   ██╗
# ██║      ██╔════╝ ██║ ██╔╝ ██╔══██╗ ██╔══██╗ ████╗  ██║ ██║ ██╔╝ ██╔════╝ ████╗  ██║
# ██║      █████╗   █████╔╝  ██████╔╝ ███████║ ██╔██╗ ██║ █████╔╝  █████╗   ██╔██╗ ██║
# ██║      ██╔══╝   ██╔═██╗  ██╔══██╗ ██╔══██║ ██║╚██╗██║ ██╔═██╗  ██╔══╝   ██║╚██╗██║
# ███████╗ ███████╗ ██║  ██╗ ██████╔╝ ██║  ██║ ██║ ╚████║ ██║  ██╗ ███████╗ ██║ ╚████║
# ╚══════╝ ╚══════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝  ╚═══╝

#   ⚡  VS CODE WORKFLOW — JOHAN EDITION  ⚡
###  _A Tactical Manual for Safe, Clean, and Stylish Coding_
###  _Dark Mode Required. Hoodie Optional._

---

# ============================================================
#   🟪 1. STARTA DAGEN
## <Här gör du allt för att ladda projektet, få senaste kod och starta servern.>
# ============================================================

## 1.1 Öppna projektet
## <!--*Öppna lekbanken-main i VS Code innan du gör något annat.* -->

→ VS Code → Open Folder → lekbanken-main


## 1.2 Hämta senaste ändringar (ALLTID först)
## <!--Detta gör att du inte skriver över något som Codex eller du själv gjorde tidigare.* -->
```bash
git pull
```


## 1.3 Starta dev-servern
## <!--*Det är denna som visar appen på localhost.* -->
```bash
npm run dev
```

## 1.3.1 Om du får LOCKFILE / .next-fel
## <!--*Vanligt på Windows. Helt normalt.* -->
```bash
Remove-Item -Recurse -Force .next
npm run dev
```

## 1.3.2 Om port 3000 är upptagen
## <!--*Next.js startar automatiskt på 3001.* -->
→ http://localhost:3001



# ============================================================
#   🟦 2. UNDER DAGEN (ACTIVE CODING)
## <Spara ofta, testa ofta och håll koll på git-status.>
# ============================================================

## 2.1 Spara filer
## <!--*VS Code autosparar ibland, men räkna aldrig med det.* -->
CTRL + S

## 2.2 Se vad som är ändrat i projektet
## <!--*Detta är kommandot du kör för att förstå läget.* -->
```bash
git status
```
- M = du har modifierat en fil  
- ?? = ny fil  
- D = raderad fil  
- Inga ändringar = rent och fint

## 2.3 Testa i browsern
## <!--*Förhandsgranska appen medan du jobbar.* -->
→ http://localhost:3000  
→ eller http://localhost:3001

## 2.4 Om du råkar öppna Node REPL (du ser `>`)
## <!--*Det händer lätt om du skriver fel i terminalen.* -->
Tryck:  
CTRL + C  
CTRL + C



# ============================================================
#   🟥 3. NÄR DU ÄR FÄRDIG FÖR DAGEN
## <Stäng dev-servern, commit:a, pusha, och lämna projektet i bra skick.>
# ============================================================

## 3.1 Stäng dev-servern
```bash
CTRL + C
```

## 3.2 Stage:a ändringar (lägg till allt du ändrat)
```bash
git add .
```

## 3.3 Commit:a med en enkel, tydlig text
```bash
git commit -m "Today's progress"
```

## 3.4 Skicka upp allt till GitHub (push)
```bash
git push
```

## 3.5 Stäng VS Code
## <!-- *Ingen magi behövs — bara stäng programmet.* -->



# ============================================================
#   🟨 4. TIPS & REGLER (KEEP YOURSELF ALIVE)
## <Det här är dina överlevnadsregler som gör att git och Codex inte exploderar.>
# ============================================================

## 4.1 .env.local ska ALDRIG commitas
## <!--*Den ligger i .gitignore. Den är personlig. Hemlig. Lokal.* -->

## 4.2 .env.local.example SKA commitas
## <!--*Det är din mall för andra. Den ska ligga i repo.* -->

## 4.3 Om git säger "(non-fast-forward)"
## <!--*Det betyder att någon pushat före dig (oftast Codex).* -->
```bash
git pull
# fixa ev. merge (VS Code hjälper)
git push
```

## 4.4 När något känns “fel”
## <!--*90% av alla problem fixas så här:* -->
```bash
git pull
npm run dev
```



# ============================================================
#   🟪 5. MINI CHEATSHEET (Tejpa på skärmen om du vill)
## <Superkort version du alltid kan gå tillbaka till.>
# ============================================================

## STARTA DAGEN
```bash
git pull
npm run dev
```

## UNDER DAGEN
```bash
CTRL + S
git status
```

## AVSLUTA
```bash
CTRL + C
git add .
git commit -m "Today's progress"
git push
```

## NÄR NÅT JÄVLAS
```bash
Remove-Item -Recurse -Force .next
npm run dev
```


# ============================================================
#   END OF FILE — YOU ARE NOW OFFICIALLY A VS CODE OPERATOR
# ============================================================

