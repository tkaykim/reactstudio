import { requireMe } from '@/lib/me-auth';
import EarningsClient from './EarningsClient';

export default async function MyEarningsPage() {
  const user = await requireMe('/me/earnings');
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">내 지급 현황</h1>
        <p className="text-white/40 text-xs mt-1">
          지급받을 금액과 지급 완료 내역을 확인할 수 있습니다.
        </p>
      </div>
      <EarningsClient hasPartnerLink={user.partner_id != null} />
    </div>
  );
}
