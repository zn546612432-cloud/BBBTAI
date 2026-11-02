# Run by right-clicking -> Run with PowerShell (requires Node.js 22+).
# Keys are read silently, passed to the current Node process only, and cleared afterward.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
Push-Location $root
try {
  Write-Host "熙泰 DeepSeek / MiniMax 测试" -ForegroundColor Cyan
  Write-Host "[1] 快速 A/B：16次 DeepSeek 请求"
  Write-Host "[2] 完整 A/B：144次 DeepSeek 请求，可能产生大量费用"
  Write-Host "[3] MiniMax 语速试听：三段 MP3"
  Write-Host "[4] 检查模型与情景列表：不联网"
  $choice = Read-Host "请选择 1–4"
  $flags = switch ($choice) {
    "1" { "--quick" }
    "2" { "--full" }
    "3" { "--tts" }
    "4" { "--dry-run" }
    default { throw "无效选择" }
  }
  if ($choice -ne "4") {
    if ($choice -eq "3") {
      $secret = Read-Host "MiniMax API Key（输入时隐藏）" -AsSecureString
      $env:MINIMAX_API_KEY = [System.Net.NetworkCredential]::new("",$secret).Password
      Remove-Variable secret
    } else {
      $secret = Read-Host "DeepSeek API Key（输入时隐藏）" -AsSecureString
      $env:DEEPSEEK_API_KEY = [System.Net.NetworkCredential]::new("",$secret).Password
      Remove-Variable secret
    }
  }
  & node (Join-Path $here "benchmark-xitai.mjs") $flags
  if ($LASTEXITCODE -ne 0) { throw "测试进程失败：退出码 $LASTEXITCODE" }
  Write-Host "报告与语音样本输出至：$root\benchmark-results" -ForegroundColor Green
} catch {
  Write-Host ("运行失败：" + $_.Exception.Message) -ForegroundColor Red
} finally {
  Remove-Item Env:\MINIMAX_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:\DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
  Pop-Location
  Read-Host "按 Enter 键关闭窗口"
}
