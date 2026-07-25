using System.Data;
using FastReport;
using FastReport.Export.PdfSimple;
using Microsoft.Data.SqlClient;

namespace NewReleaseReportApi.Services;

public class ReportService
{
    private readonly string _connectionString;
    private readonly string _reportsFolder;

    public ReportService(IConfiguration configuration, IWebHostEnvironment env)
    {
        _connectionString = configuration.GetConnectionString("ErpMega")
            ?? throw new InvalidOperationException("ConnectionStrings:ErpMega is not configured.");
        _reportsFolder = Path.Combine(env.ContentRootPath, "Reports");
    }

    public byte[] GenerateReport(int reportId, string keyValue)
    {
        var (fileName, keyParam) = GetReportMeta(reportId);
        var queries = GetReportQueries(reportId);

        if (queries.Count == 0)
        {
            throw new InvalidOperationException($"Report {reportId} has no queries configured.");
        }

        var templatePath = Path.Combine(_reportsFolder, fileName);
        if (!File.Exists(templatePath))
        {
            throw new InvalidOperationException($"Report file not found: {fileName}");
        }

        // The .frx dictionary binds tables through one registered DataSet named "Data" whose
        // TableN sources match a table literally named "TableN" (registering each table under
        // its own name instead leaves the dictionary's sources "not connected to the data").
        var dataSet = new DataSet("Data");
        var tableIndex = 1;
        foreach (var (_, querySql) in queries)
        {
            var table = RunQuery(querySql, keyParam, keyValue);
            table.TableName = "Table" + tableIndex;
            dataSet.Tables.Add(table);
            tableIndex++;
        }

        if (dataSet.Tables["Table1"]!.Rows.Count == 0)
        {
            throw new InvalidOperationException($"No data found for {keyParam} = {keyValue}.");
        }

        using var report = new Report();
        report.Load(templatePath);

        report.RegisterData(dataSet, "Data");
        foreach (DataTable table in dataSet.Tables)
        {
            var source = report.GetDataSource(table.TableName);
            if (source != null) source.Enabled = true;
        }

        report.Prepare();

        using var stream = new MemoryStream();
        var pdfExport = new PDFSimpleExport();
        report.Export(pdfExport, stream);
        return stream.ToArray();
    }

    private (string FileName, string KeyParam) GetReportMeta(int reportId)
    {
        const string sql = "SELECT [FileName], KeyParam FROM [PLS].[ReportsMaster] WHERE ReportID = @ReportID";

        using var connection = new SqlConnection(_connectionString);
        using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@ReportID", reportId);

        connection.Open();
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            throw new InvalidOperationException($"Report {reportId} was not found in Reports Master.");
        }

        var fileName = reader.GetString(0);
        var keyParam = reader.IsDBNull(1) ? "" : reader.GetString(1);
        return (fileName, keyParam);
    }

    private List<(string QueryName, string QuerySQL)> GetReportQueries(int reportId)
    {
        const string sql = "SELECT QueryName, QuerySQL FROM [PLS].[ReportQueries] WHERE ReportID = @ReportID ORDER BY SortOrder";

        var result = new List<(string, string)>();
        using var connection = new SqlConnection(_connectionString);
        using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@ReportID", reportId);

        connection.Open();
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            result.Add((reader.GetString(0), reader.GetString(1)));
        }
        return result;
    }

    private DataTable RunQuery(string sql, string keyParam, string keyValue)
    {
        using var connection = new SqlConnection(_connectionString);
        using var command = new SqlCommand(sql, connection);

        // keyParam is trusted metadata from our own ReportsMaster catalog (not caller input),
        // so building the parameter name from it here is safe -- the actual value is still
        // always bound, never concatenated into the SQL text.
        if (!string.IsNullOrEmpty(keyParam))
        {
            command.Parameters.AddWithValue("@" + keyParam, keyValue);
        }

        var table = new DataTable();
        connection.Open();
        using var adapter = new SqlDataAdapter(command);
        adapter.Fill(table);
        return table;
    }
}
