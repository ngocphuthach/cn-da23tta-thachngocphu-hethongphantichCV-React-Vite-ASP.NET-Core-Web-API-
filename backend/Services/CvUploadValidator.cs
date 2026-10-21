using System.IO.Compression;
using System.Xml;

namespace CvAdvisor.Api.Services;

public sealed class CvUploadValidator
{
    public const int MaxFileBytes = 5 * 1024 * 1024;
    private const int MaxDocumentXmlBytes = 10 * 1024 * 1024;

    public string ValidateAndGetExtension(string filename, ReadOnlyMemory<byte> content)
    {
        if (content.Length == 0 || content.Length > MaxFileBytes)
        {
            throw new InvalidCvUploadException("File CV phải có nội dung và không vượt quá 5 MB.");
        }

        var extension = Path.GetExtension(Path.GetFileName(filename)).ToLowerInvariant();
        if (extension == ".pdf")
        {
            if (!content.Span.StartsWith("%PDF-"u8))
            {
                throw new InvalidCvUploadException("Đuôi .pdf không khớp chữ ký nội dung PDF.");
            }

            return extension;
        }

        if (extension != ".docx")
        {
            throw new InvalidCvUploadException("Chỉ hỗ trợ CV định dạng PDF hoặc DOCX.");
        }

        ValidateDocx(content);
        return extension;
    }

    private static void ValidateDocx(ReadOnlyMemory<byte> content)
    {
        var span = content.Span;
        if (span.Length < 4 || span[0] != (byte)'P' || span[1] != (byte)'K'
            || span[2] != 0x03 || span[3] != 0x04)
        {
            throw new InvalidCvUploadException("Đuôi .docx không khớp chữ ký ZIP của DOCX.");
        }

        try
        {
            using var input = new MemoryStream(content.ToArray(), writable: false);
            using var archive = new ZipArchive(input, ZipArchiveMode.Read, leaveOpen: false);
            var documentEntries = archive.Entries
                .Where(entry => string.Equals(entry.FullName, "word/document.xml", StringComparison.Ordinal))
                .ToArray();
            if (documentEntries.Length != 1)
            {
                throw new InvalidCvUploadException("DOCX phải có đúng một entry word/document.xml.");
            }

            var documentEntry = documentEntries[0];
            if (documentEntry.Length <= 0 || documentEntry.Length > MaxDocumentXmlBytes)
            {
                throw new InvalidCvUploadException("Nội dung DOCX sau giải nén vượt giới hạn cho phép.");
            }

            using var entryStream = documentEntry.Open();
            using var boundedContent = new MemoryStream((int)documentEntry.Length);
            var buffer = new byte[81920];
            var totalBytes = 0;
            int bytesRead;
            while ((bytesRead = entryStream.Read(buffer, 0, buffer.Length)) > 0)
            {
                totalBytes += bytesRead;
                if (totalBytes > MaxDocumentXmlBytes)
                {
                    throw new InvalidCvUploadException("Nội dung DOCX sau giải nén vượt giới hạn cho phép.");
                }

                boundedContent.Write(buffer, 0, bytesRead);
            }

            boundedContent.Position = 0;
            using var reader = XmlReader.Create(boundedContent, new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
                MaxCharactersInDocument = MaxDocumentXmlBytes,
            });
            while (reader.Read())
            {
            }
        }
        catch (InvalidCvUploadException)
        {
            throw;
        }
        catch (Exception exception) when (exception is InvalidDataException or IOException or XmlException)
        {
            throw new InvalidCvUploadException("Không đọc được cấu trúc DOCX.");
        }
    }
}

public sealed class InvalidCvUploadException(string message) : Exception(message);
