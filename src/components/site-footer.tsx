import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/30 bg-background/40 backdrop-blur-xl mt-16 pb-20 md:pb-0">
      <div className="container grid gap-8 py-12 md:grid-cols-5">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500">
              <span className="text-sm font-black text-white">A</span>
            </div>
            <span className="text-base font-bold">
              Ausbildung <span className="text-primary">Hub</span> Vietnam
            </span>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Nền tảng số 1 về du học nghề Đức dành cho người Việt Nam — kết nối học viên,
            trung tâm tiếng Đức và nhà tuyển dụng Đức trên một không gian minh bạch.
          </p>
        </div>
        <FooterCol
          title="Sản phẩm"
          links={[
            ["Tin tức", "/news"],
            ["Trung tâm", "/centers"],
            ["Việc làm", "/jobs"],
            ["Bảng giá", "/pricing"],
          ]}
        />
        <FooterCol
          title="Cộng đồng"
          links={[
            ["Diễn đàn", "/community"],
            ["Quiz đánh giá", "/quiz"],
            ["Học viên", "/dashboard/student"],
          ]}
        />
        <FooterCol
          title="Doanh nghiệp"
          links={[
            ["Trung tâm", "/dashboard/center"],
            ["Nhà tuyển dụng", "/dashboard/employer"],
            ["Quản trị", "/admin"],
          ]}
        />
      </div>
      <div className="border-t border-border/30">
        <div className="container py-4 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 Ausbildung Hub Vietnam. Mọi quyền được bảo lưu.</span>
          <span>Made with ♥ in Hà Nội · Berlin</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {links.map(([l, h]) => (
          <li key={h}>
            <Link href={h} className="hover:text-foreground">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
