import { Toaster } from "react-hot-toast";

const GlobalToast = () => {
  return (
    <Toaster
      containerClassName="z-[9999]" // cho toast nổi lên trên cùng luôn
      position="top-right"
      reverseOrder={false}
      toastOptions={{
        // Cấu hình style Toast toàn dự án
        className: "text-sm font-medium",
        duration: 4000,
        style: {
          background: "#ffffff",
          color: "#334155", // Màu text-slate-700
          boxShadow:
            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          borderRadius: "12px",
          padding: "16px",
        },
        success: {
          iconTheme: {
            primary: "#10b981", //
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444", // Màu red-500
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
};

export default GlobalToast;
