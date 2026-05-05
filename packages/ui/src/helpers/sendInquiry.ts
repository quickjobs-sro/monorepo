import API from "quickjobs-api-wrapper";

type InquiryData = {
  email: string;
  name?: string | undefined;
  subject?: string | undefined;
  message: string;
};

export const sendInquiry = async (data: InquiryData) => {
  const response = await API.services.sendInquiry(data);
  return response;
};
