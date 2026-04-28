# Local package test plan

This guide validates RunTrim as a globally linked CLI before npm publish.

## Prerequisites

- Node.js 20+
- npm 10+

## From the RunTrim repo

```bash
npm install
npm run build:cli
npm link
```

## Create a temporary demo repo (bash)

```bash
mkdir ../runtrim-demo
cd ../runtrim-demo
npm init -y
git init
echo "console.log('hello')" > index.js
runtrim init
runtrim prepare "change hello to hello from RunTrim"
runtrim run "change hello to hello from RunTrim"
runtrim check
runtrim memory
runtrim auth status
runtrim report
```

## Create a temporary demo repo (Windows PowerShell)

```powershell
mkdir ..\runtrim-demo
cd ..\runtrim-demo
npm init -y
git init
Set-Content index.js "console.log('hello')"
runtrim init
runtrim prepare "change hello to hello from RunTrim"
runtrim run "change hello to hello from RunTrim"
runtrim check
runtrim memory
runtrim auth status
runtrim report
```

## Validate package payload without publishing

```bash
cd ../rtrim
npm run build:cli
npm pack --dry-run
npm publish --dry-run
```

## Unlink global command

```bash
npm unlink -g runtrim
```

## Unlink global command (PowerShell)

```powershell
npm unlink -g runtrim
```
