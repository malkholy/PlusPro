using NewReleaseReportApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ReportService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/reports/{reportId:int}/{keyValue}", (int reportId, string keyValue, HttpContext ctx, ReportService reportService) =>
{
    try
    {
        var pdfBytes = reportService.GenerateReport(reportId, keyValue);
        // No fileDownloadName here on purpose: Results.File sets Content-Disposition: attachment
        // whenever a filename is supplied, which forces a download and breaks inline <iframe> preview.
        ctx.Response.Headers["Content-Disposition"] = $"inline; filename=\"Report_{reportId}_{keyValue}.pdf\"";
        return Results.File(pdfBytes, "application/pdf");
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
})
.WithName("GetReport")
.WithOpenApi();

app.MapGet("/api/reports/{reportId:int}/{keyValue}/download", (int reportId, string keyValue, ReportService reportService) =>
{
    try
    {
        var pdfBytes = reportService.GenerateReport(reportId, keyValue);
        return Results.File(pdfBytes, "application/pdf", $"Report_{reportId}_{keyValue}.pdf");
    }
    catch (InvalidOperationException ex)
    {
        return Results.NotFound(new { message = ex.Message });
    }
})
.WithName("DownloadReport")
.WithOpenApi();

app.Run();
