; FoodHub Print Agent — Inno Setup Script
; Generates FoodHubPrintAgentSetup.exe

#define MyAppName "FoodHub Print Agent"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "FoodHub09"
#define MyAppURL "https://start-a-new-quest.lovable.app/downloads"
#define MyAppExeName "FoodHubPrintAgent.exe"

[Setup]
AppId={{8F4E2A9B-3C5D-4A1E-B7F8-9D2E6C4A5B3F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\FoodHub Print Agent
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=FoodHubPrintAgentSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na área de trabalho"; GroupDescription: "Ícones adicionais:"
Name: "startup"; Description: "Iniciar com o Windows"; GroupDescription: "Configurações:"

[Files]
Source: "..\dist\FoodHubPrintAgent.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Registry]
; Auto-start with Windows
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "FoodHubPrintAgent"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startup

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar FoodHub Print Agent agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "taskkill"; Parameters: "/F /IM FoodHubPrintAgent.exe"; Flags: runhidden; RunOnceId: "KillAgent"

[Code]
// Try to open firewall port 8123
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    Exec('netsh', 'advfirewall firewall add rule name="FoodHub Print Agent" dir=in action=allow protocol=TCP localport=8123', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    Exec('netsh', 'advfirewall firewall delete rule name="FoodHub Print Agent"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
