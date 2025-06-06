import * as SibApiV3Sdk from "@getbrevo/brevo";

type EmailContent = {
  subject: string;
  htmlContent: string;
  textContent?: string;
};

type EmailRecipient = {
  email: string;
  name?: string;
};

type EmailResponse = {
  success: boolean;
  messageId?: string;
  error?: {
    code?: string | number;
    message: string;
    details?: any;
  };
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const initializeBrevoApi = (apiKey: string) => {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    apiKey
  );
  return apiInstance;
};

const sendEmail = async (
  apiKey: string,
  senderEmail: string,
  senderName: string,
  recipient: EmailRecipient,
  content: EmailContent
): Promise<EmailResponse> => {
  try {
    if (!apiKey) {
      return {
        success: false,
        error: {
          code: "MISSING_API_KEY",
          message: "API key is required",
        },
      };
    }

    if (!isValidEmail(senderEmail)) {
      return {
        success: false,
        error: {
          code: "INVALID_SENDER",
          message: `Invalid sender email: ${senderEmail}`,
        },
      };
    }

    if (!isValidEmail(recipient.email)) {
      return {
        success: false,
        error: {
          code: "INVALID_RECIPIENT",
          message: `Invalid recipient email: ${recipient.email}`,
        },
      };
    }

    if (!content.subject || !content.htmlContent) {
      return {
        success: false,
        error: {
          code: "MISSING_CONTENT",
          message: "Email subject and HTML content are required",
        },
      };
    }

    const apiInstance = initializeBrevoApi(apiKey);

    const emailData = {
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [recipient],
      subject: content.subject,
      htmlContent: content.htmlContent,
      textContent: content.textContent,
    };

    const response = await apiInstance.sendTransacEmail(emailData);

    return {
      success: true,
      messageId: response.body.messageId,
    };
  } catch (error: any) {
    if (error.response && error.response.body) {
      return {
        success: false,
        error: {
          code: error.response.body.code || error.response.statusCode,
          message: error.response.body.message || "Error sending email",
          details: error.response.body,
        },
      };
    } else if (error instanceof Error) {
      return {
        success: false,
        error: {
          code: "RUNTIME_ERROR",
          message: error.message,
          details: error.stack,
        },
      };
    } else {
      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "An unknown error occurred while sending email",
          details: error,
        },
      };
    }
  }
};

export {
  sendEmail,
  type EmailContent,
  type EmailRecipient,
  type EmailResponse,
};
