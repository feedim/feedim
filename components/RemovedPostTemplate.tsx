import Link from "next/link";

interface RemovedPostTemplateProps {
  reason?: string | null;
  decisionNumber?: number | null;
}

export default function RemovedPostTemplate({ reason, decisionNumber }: RemovedPostTemplateProps) {
  return (
    <div className="px-4 sm:px-5 py-8 max-w-lg mx-auto text-center">
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Gönderi kaldırıldı</h2>
        <p className="text-sm text-red-700 dark:text-red-400 mb-4">
          Bu gönderi moderatörler tarafından incelenmiş ve topluluk kurallarına aykırı bulunarak kaldırılmıştır.
        </p>
        {decisionNumber && (
          <p className="text-xs text-red-600 dark:text-red-500 mb-2">
            Karar No: <strong>#{decisionNumber}</strong>
          </p>
        )}
        {reason && (
          <p className="text-xs text-red-600 dark:text-red-500 mb-4">
            Sebep: {reason}
          </p>
        )}
        <Link
          href="/help"
          className="inline-block text-sm font-medium text-red-700 dark:text-red-400 underline hover:no-underline"
        >
          Karar numarası ile itiraz etmek için iletişime geçin
        </Link>
      </div>
    </div>
  );
}
