const TEL = "+420773234091";
const EMAIL = "podpora@quickjobs.cz";

const CustomerSupport = () => {
  return (
    <div className="w-full text-center py-6 my-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Zákaznická podpora
      </h2>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <a>+420 773 234 091</a>
        </div>
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <a>{EMAIL}</a>
        </div>
      </div>
      <hr className="my-4 border-gray-300 max-w-[700px] mx-auto" />
      <div className="text-gray-600 flex justify-center gap-4 text-sm">
        <a href="/dashboard/pricing" className="hover:underline">
          Ceník
        </a>
        <span>•</span>
        <a
          href="https://www.quickjobs.cz/obchodni-podminky"
          target="_blank"
          className="hover:underline"
        >
          Obchodní podmínky
        </a>
        <span>•</span>
        <a
          href="https://www.quickjobs.cz/ochrana-osobnich-udaju"
          target="_blank"
          className="hover:underline"
        >
          Ochrana osobních údajů
        </a>
      </div>
    </div>
  );
};

export default CustomerSupport;
