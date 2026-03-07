import NewTabLink from "@/components/NewTabLink";

export default function AboutContentTr() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Hakkımızda</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>Feedim, kullanıcıların gönderi ve video paylaşabildiği, özgün içeriklerinden Jeton kazanabildiği bir sosyal içerik platformudur. İçerik üreticileri yazılarını ve videolarını paylaşır; premium okuyucular içerikleri okuyup izledikçe üreticiler otomatik Jeton kazanır. Ayrıca reklam gelir paylaşımı ve hediye sistemiyle ek kazanç elde edilebilir.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Misyonumuz</h2>
        <p>Kaliteli ve özgün içerik üretimini teşvik etmek, içerik üreticilerini emeklerinin karşılığında adil bir şekilde ödüllendirmek ve okuyuculara değerli, ilgi çekici içerikler sunarak herkes için anlamlı bir platform deneyimi oluşturmak.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Nasıl Çalışır?</h2>
        <p>İçerik üreticileri gönderi ve video paylaşır. Premium okuyucular bu içerikleri okuyup izledikçe üreticiler Jeton kazanır. Ayrıca reklam gelir paylaşımı ile ek kazanç elde edilir ve diğer kullanıcılardan hediye alınabilir. Kazanılan Jetonlar nakde çevrilebilir.</p>
        <p>Siz de Feedim&apos;in bir parçası olun; bu yeni nesil platformun doğuşuna en ön saflardan tanıklık edin.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Bize Ulaşın</h2>
        <p>Sorularınız veya geri bildirimleriniz mi var?{" "}
          <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">İletişim sayfamızı</NewTabLink>{" "}
          ziyaret ederek bizimle iletişime geçebilirsiniz.
        </p>
      </div>
    </>
  );
}
