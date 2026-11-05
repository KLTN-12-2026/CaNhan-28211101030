import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const contentMap = {
  '/about': {
    title: 'Về FreelanceAI Platform',
    subtitle: 'Nền tảng kết nối nhân tài công nghệ và doanh nghiệp hàng đầu tích hợp AI Matching thông minh.',
    sections: [
      {
        heading: 'Sứ mệnh của chúng tôi',
        body: 'FreelanceAI được xây dựng nhằm thu hẹp khoảng cách giữa các lập trình viên tài năng và doanh nghiệp. Bằng cách áp dụng công nghệ trí tuệ nhân tạo (AI/LLM) vào việc phân tích CV, đánh giá kỹ năng chuyên sâu và tự động tính toán điểm phù hợp công việc (AI Matching Score), chúng tôi giúp tiết kiệm tới 70% thời gian tuyển dụng và đảm bảo đúng người đúng việc.'
      },
      {
        heading: 'Các trụ cột công nghệ cốt lõi',
        body: '1. AI Smart Matcher: Phân tích kỹ năng, kinh nghiệm và ngôn ngữ lập trình để tìm ứng viên chính xác.\n2. Hợp đồng ký quỹ Escrow: Bảo vệ quyền lợi tài chính minh bạch cho cả khách hàng và freelancer.\n3. Chatbot Trợ lý ảo & Tư vấn nghề nghiệp: Gợi ý kỹ năng cần cải thiện dựa trên xu hướng thị trường.'
      },
      {
        heading: 'Đội ngũ phát triển',
        body: 'Dự án Khóa luận tốt nghiệp Đại học bởi nhóm nghiên cứu FreelanceAI Platform. Hệ thống liên tục được nâng cấp với các mô hình máy học hiện đại nhất.'
      }
    ]
  },
  '/terms': {
    title: 'Điều khoản dịch vụ (Terms of Service)',
    subtitle: 'Quy định và quyền lợi khi tham gia giao dịch trên nền tảng FreelanceAI.',
    sections: [
      {
        heading: '1. Điều kiện tham gia',
        body: 'Người dùng phải đăng ký tài khoản chính chủ bằng email hợp lệ và chịu trách nhiệm bảo mật thông tin đăng nhập cá nhân. Khách hàng và Freelancer cam kết cung cấp thông tin trung thực về hồ sơ và yêu cầu dự án.'
      },
      {
        heading: '2. Quy chế thanh toán & Ký quỹ Escrow',
        body: 'Mọi giao dịch thanh toán dự án được bảo vệ thông qua cơ chế ký quỹ (Escrow). Tiền của khách hàng được tạm giữ an toàn trong hệ thống và chỉ được giải ngân cho freelancer khi sản phẩm bàn giao được khách hàng nghiệm thu đạt yêu cầu.'
      },
      {
        heading: '3. Quyền sở hữu trí tuệ',
        body: 'Sau khi thanh toán đầy đủ, toàn bộ mã nguồn và quyền sở hữu sản phẩm dự án được chuyển giao hợp pháp cho khách hàng, trừ khi có thỏa thuận văn bản khác giữa hai bên.'
      }
    ]
  },
  '/privacy': {
    title: 'Chính sách bảo mật (Privacy Policy)',
    subtitle: 'Cam kết bảo mật dữ liệu cá nhân, thông tin dự án và thanh toán của bạn.',
    sections: [
      {
        heading: '1. Thu thập thông tin',
        body: 'Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ quá trình kết nối công việc: tên, email, hồ sơ kỹ năng, CV và lịch sử giao dịch. Thông tin mật khẩu được mã hóa an toàn theo chuẩn PBKDF2/SHA256.'
      },
      {
        heading: '2. Ứng dụng AI và bảo vệ dữ liệu',
        body: 'Dữ liệu CV của bạn chỉ được trích xuất nhằm mục đích gợi ý việc làm và tạo bio hồ sơ. Chúng tôi cam kết không bán hoặc chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích quảng cáo rác.'
      },
      {
        heading: '3. Quyền của người dùng',
        body: 'Bạn có toàn quyền chỉnh sửa, ẩn hồ sơ hoặc yêu cầu xóa dữ liệu tài khoản bất cứ lúc nào thông qua trang Cài đặt (Settings).'
      }
    ]
  },
  '/careers': {
    title: 'Cơ hội nghề nghiệp tại FreelanceAI',
    subtitle: 'Gia nhập đội ngũ xây dựng tương lai của nền kinh tế làm việc tự do.',
    sections: [
      {
        heading: 'Văn hóa công ty',
        body: 'Chúng tôi tin tưởng vào sự linh hoạt, tự chủ và lấy công nghệ làm trọng tâm phát triển. Mỗi thành viên đều được trao quyền đưa ra quyết định và thử nghiệm các ý tưởng đổi mới sáng tạo.'
      },
      {
        heading: 'Vị trí đang tuyển dụng',
        body: '• Senior Fullstack Engineer (React / Python Django)\n• AI / NLP Research Engineer\n• Product Designer (UI/UX)\n• Growth & Community Lead'
      }
    ]
  },
  '/press': {
    title: 'Báo chí & Truyền thông',
    subtitle: 'Tin tức, thông cáo báo chí và tài nguyên thương hiệu FreelanceAI.',
    sections: [
      {
        heading: 'Thông tin báo chí',
        body: 'FreelanceAI tiên phong tích hợp trí tuệ nhân tạo toàn diện vào mô hình sàn việc làm tự do tại Việt Nam, hỗ trợ cả thanh toán nội địa qua MoMo và quốc tế.'
      },
      {
        heading: 'Liên hệ truyền thông',
        body: 'Email: press@freelanceai.vn | Hotline: (024) 6680 5588'
      }
    ]
  },
  '/cookies': {
    title: 'Chính sách Cookie',
    subtitle: 'Cách chúng tôi sử dụng cookie để mang lại trải nghiệm tốt nhất cho bạn.',
    sections: [
      {
        heading: '1. Cookie là gì?',
        body: 'Cookie là các tệp văn bản nhỏ được lưu trên trình duyệt của bạn nhằm duy trì phiên đăng nhập và ghi nhớ tùy chọn ngôn ngữ/giao diện.'
      },
      {
        heading: '2. Các loại Cookie chúng tôi sử dụng',
        body: '• Cookie xác thực: Để bạn không phải đăng nhập lại mỗi khi chuyển trang.\n• Cookie hiệu năng: Giúp phân tích tốc độ tải trang và tối ưu trải nghiệm.'
      }
    ]
  }
};

const StaticInfoPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const content = contentMap[currentPath] || contentMap['/about'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Navbar */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-white group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              AI
            </span>
            <span className="text-xl font-black tracking-tight">FreelanceAI</span>
          </Link>

          <div className="flex items-center space-x-3 text-sm">
            <Link
              to="/"
              className="text-slate-400 hover:text-white px-3 py-2 rounded-xl transition-colors font-medium flex items-center space-x-1"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Trang chủ</span>
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            {content.title}
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            {content.subtitle}
          </p>
        </div>

        <div className="space-y-10">
          {content.sections.map((sec, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-slate-900/60 border border-white/5 backdrop-blur-sm"
            >
              <h2 className="text-xl font-bold text-white mb-3">
                {sec.heading}
              </h2>
              <div className="text-slate-300 leading-relaxed text-sm sm:text-base whitespace-pre-line font-normal">
                {sec.body}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-500/20 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Bạn đã sẵn sàng nâng tầm sự nghiệp?</h3>
          <p className="text-sm text-slate-400 mb-6">Tham gia mạng lưới hơn hàng nghìn Freelancer và Doanh nghiệp trên FreelanceAI ngay hôm nay.</p>
          <div className="flex justify-center gap-4">
            <Link to="/register" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all">
              Bắt đầu ngay
            </Link>
            <Link to="/" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all">
              Khám phá thêm
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
        <p>© 2026 FreelanceAI Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default StaticInfoPage;
