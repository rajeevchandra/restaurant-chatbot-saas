Write-Host "Installing all dependencies..."
pnpm install -r

Write-Host "Building all packages..."
pnpm build

Write-Host "Starting API..."
Start-Process powershell -ArgumentList "cd apps/api; pnpm dev"

Write-Host "Starting Admin..."
Start-Process powershell -ArgumentList "cd apps/admin; pnpm dev"

Write-Host "Starting Widget..."
Start-Process powershell -ArgumentList "cd apps/widget; pnpm dev"

Write-Host "All services are starting in new windows."
