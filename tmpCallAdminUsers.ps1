$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTVhZjAxNDk2MjcwZWM4N2Y3NWIzZSIsImlhdCI6MTc3NjY2MzUwOCwiZXhwIjoxNzc5MjU1NTA4fQ.g1W-hvJGX54tSe98cYfiv2boj71G7SZoVOiVFefF0g'
$response = Invoke-RestMethod -Uri 'http://localhost:5000/api/admin/users' -Headers @{ Authorization = "Bearer $token" }
$response | ConvertTo-Json -Depth 5
