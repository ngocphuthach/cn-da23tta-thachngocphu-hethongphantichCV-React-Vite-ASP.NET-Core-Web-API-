using System.ComponentModel.DataAnnotations;
using System.Data;
using CvAdvisor.Api.Data;
using CvAdvisor.Api.Models.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CvAdvisor.Api.Services;

public static class AdminBootstrap
{
    public static async Task<int> RunAsync(bool resetExisting)
    {
        if (Console.IsInputRedirected || Console.IsOutputRedirected)
        {
            Console.Error.WriteLine("admin-bootstrap cần terminal tương tác; không có thay đổi nào được thực hiện.");
            return 2;
        }

        var configuration = new ConfigurationBuilder()
            .SetBasePath(AppContext.BaseDirectory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.Error.WriteLine("Thiếu cấu hình kết nối database cho backend.");
            return 2;
        }

        Console.Write(resetExisting ? "Email tài khoản Admin cần đặt lại: " : "Email Admin: ");
        var email = (Console.ReadLine() ?? string.Empty).Trim().ToLowerInvariant();
        var fullName = string.Empty;
        if (!resetExisting)
        {
            Console.Write("Họ tên Admin: ");
            fullName = (Console.ReadLine() ?? string.Empty).Trim();
        }
        Console.Write("Mật khẩu mới: ");
        var password = ReadHiddenPassword();
        Console.Write("Nhập lại mật khẩu: ");
        var confirmation = ReadHiddenPassword();

        if (email.Length is 0 or > 256 || !new EmailAddressAttribute().IsValid(email)
            || (!resetExisting && fullName.Length is 0 or > 150))
        {
            Console.Error.WriteLine("Email hoặc họ tên không hợp lệ.");
            return 2;
        }

        if (password.Length is < 8 or > 128 || !string.Equals(password, confirmation, StringComparison.Ordinal))
        {
            Console.Error.WriteLine("Mật khẩu phải có 8–128 ký tự và hai lần nhập phải trùng nhau.");
            return 2;
        }

        try
        {
            var options = new DbContextOptionsBuilder<CvCareerDbContext>()
                .UseSqlServer(connectionString)
                .Options;
            await using var dbContext = new CvCareerDbContext(options);
            await using var transaction = await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);

            var target = resetExisting
                ? await dbContext.Users.SingleOrDefaultAsync(user => user.Email == email && user.Role == UserRoles.Admin)
                : null;

            if (resetExisting && target is null)
            {
                Console.Error.WriteLine("Không tìm thấy tài khoản Admin tương ứng.");
                return 3;
            }

            if (!resetExisting && await dbContext.Users.AsNoTracking().AnyAsync(user => user.Role == UserRoles.Admin))
            {
                Console.Error.WriteLine("Đã có Admin; bootstrap chỉ chạy khi chưa tồn tại Admin.");
                return 3;
            }

            if (!resetExisting && await dbContext.Users.AsNoTracking().AnyAsync(user => user.Email == email))
            {
                Console.Error.WriteLine("Email này đã được sử dụng.");
                return 3;
            }

            var user = target ?? new User
            {
                Email = email,
                FullName = fullName,
                Role = UserRoles.Admin,
                IsActive = true,
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
            if (!resetExisting) dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync();
            await transaction.CommitAsync();
            Console.WriteLine(resetExisting
                ? "Đã đặt lại mật khẩu Admin. Hãy đăng nhập qua giao diện thông thường."
                : "Đã tạo Admin. Hãy đăng nhập qua giao diện thông thường.");
            return 0;
        }
        catch
        {
            Console.Error.WriteLine("Không thể hoàn tất thao tác Admin. Kiểm tra database và xác nhận migration đã được áp dụng.");
            return 1;
        }
        finally
        {
            password = string.Empty;
            confirmation = string.Empty;
        }
    }

    private static string ReadHiddenPassword()
    {
        var characters = new List<char>();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter)
            {
                Console.WriteLine();
                return new string(characters.ToArray());
            }

            if (key.Key == ConsoleKey.Backspace)
            {
                if (characters.Count > 0) characters.RemoveAt(characters.Count - 1);
                continue;
            }

            if (!char.IsControl(key.KeyChar)) characters.Add(key.KeyChar);
        }
    }
}
