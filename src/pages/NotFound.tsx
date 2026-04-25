import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="section py-24 text-center">
      <div className="font-display text-7xl font-extrabold text-brand-red">404</div>
      <div className="mt-3 text-xl font-semibold">Không tìm thấy trang</div>
      <p className="text-neutral-500 mt-2">Trang bạn tìm có thể đã bị di chuyển hoặc không tồn tại.</p>
      <Link to="/" className="btn btn-primary mt-6">Về trang chủ</Link>
    </div>
  );
}
