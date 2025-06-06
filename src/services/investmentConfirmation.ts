import { EmailResponse, sendEmail } from "../config/brevo.config.js";
import { EmailContent, EmailRecipient } from "../config/brevo.config.js";
import {
  BREVO_API_KEY,
  BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME,
} from "../config/env.config.js";

if (!BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY is not set");
}
if (!BREVO_SENDER_EMAIL) {
  throw new Error("BREVO_SENDER_EMAIL is not set");
}
if (!BREVO_SENDER_NAME) {
  throw new Error("BREVO_SENDER_NAME is not set");
}

export const investmentConfirmationMail = async (
  email: string,
  name: string,
  planName: string,
  amount: number,
  date: string,
  transactionId: string
): Promise<EmailResponse> => {
  const recipient: EmailRecipient = { email, name };
  const content: EmailContent = {
    subject: "Investment Confirmation",
    textContent: `Investment Confirmation`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="X-UA-Compatible" content="ie=edge" />
		<title>Investment Confirmation – [Product Name]</title>
		<style>
			/* Base styles */
			body,
			table,
			td,
			a {
				-webkit-text-size-adjust: 100%;
				-ms-text-size-adjust: 100%;
			}
			table,
			td {
				mso-table-lspace: 0pt;
				mso-table-rspace: 0pt;
			}
			img {
				-ms-interpolation-mode: bicubic;
				border: 0;
				height: auto;
				line-height: 100%;
				outline: none;
				text-decoration: none;
			}
			table {
				border-collapse: collapse !important;
			}
			body {
				height: 100% !important;
				margin: 0 !important;
				padding: 0 !important;
				width: 100% !important;
				background-color: #f8f9fa;
			}
			/* Link styles */
			a {
				color: #007bff;
				text-decoration: underline;
			}
			/* Responsive styles */
			@media screen and (max-width: 600px) {
				.wrapper {
					width: 100% !important;
					max-width: 100% !important;
				}
				.content {
					padding: 20px !important;
				}
				.header {
					padding: 20px !important;
				}
			}
		</style>
	</head>
	<body
		style="
			margin: 0 !important;
			padding: 0 !important;
			background-color: #f8f9fa;
		"
	>
		<!-- Main Table -->
		<table border="0" cellpadding="0" cellspacing="0" width="100%">
			<tr>
				<td align="center" valign="top" style="padding: 20px">
					<!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
            <tr>
            <td align="center" valign="top" width="600">
            <![endif]-->
					<table
						border="0"
						cellpadding="0"
						cellspacing="0"
						width="100%"
						class="wrapper"
						style="
							max-width: 600px;
							border-radius: 8px;
							overflow: hidden;
							border: 1px solid #dee2e6;
						"
					>
						<!-- HEADER -->
						<tr>
							<td
								align="center"
								valign="top"
								class="header"
								style="
									padding: 30px 20px;
									background-color: #ffffff;
								"
							>
								<h1
									style="
										margin: 0;
										font-family: Arial, sans-serif;
										font-size: 28px;
										font-weight: bold;
										color: #212529;
									"
								>
									Aadyanvi Wealth
								</h1>
							</td>
						</tr>

						<!-- BODY -->
						<tr>
							<td
								align="left"
								valign="top"
								class="content"
								style="
									padding: 30px;
									background-color: #ffffff;
									font-family: Arial, sans-serif;
									font-size: 16px;
									line-height: 1.6;
									color: #495057;
								"
							>
								<h2
									style="
										margin: 0 0 20px 0;
										font-size: 22px;
										font-weight: bold;
										color: #212529;
									"
								>
									Investment Confirmation
								</h2>
								<p style="margin: 0 0 25px 0">Dear ${name},</p>
								<p style="margin: 0 0 25px 0">
									We are pleased to confirm your recent investment in
									<strong>${planName}</strong>.
								</p>

								<!-- Transaction Details Table -->
								<p
									style="
										margin: 0 0 15px 0;
										font-weight: bold;
										color: #212529;
									"
								>
									Transaction Details:
								</p>
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="margin-bottom: 30px"
								>
									<tr>
										<td
											style="
												padding: 12px 0;
												border-bottom: 1px solid #e9ecef;
											"
										>
											Investment Amount:
										</td>
										<td
											align="right"
											style="
												padding: 12px 0;
												border-bottom: 1px solid #e9ecef;
												font-weight: bold;
												color: #212529;
											"
										>
											${amount}
										</td>
									</tr>
									<tr>
										<td
											style="
												padding: 12px 0;
												border-bottom: 1px solid #e9ecef;
											"
										>
											Transaction Date:
										</td>
										<td
											align="right"
											style="
												padding: 12px 0;
												border-bottom: 1px solid #e9ecef;
											"
										>
											${date}
										</td>
									</tr>
									<tr>
										<td style="padding: 12px 0">
											Reference Number:
										</td>
										<td align="right" style="padding: 12px 0">
											${transactionId}
										</td>
									</tr>
								</table>

								<p style="margin: 0 0 25px 0">
									You can view your investment details and download
									statements by logging into your account.
								</p>

								<!-- CTA Button -->
								<table
									border="0"
									cellpadding="0"
									cellspacing="0"
									width="100%"
									style="margin-bottom: 30px"
								>
									<tr>
										<td align="center">
											<table
												border="0"
												cellpadding="0"
												cellspacing="0"
											>
												<tr>
													<td
														align="center"
														bgcolor="#007bff"
														style="border-radius: 5px"
													>
														<a
															href="https://login.aadyanviwealth.com"
															target="_blank"
															style="
																display: inline-block;
																padding: 14px 28px;
																font-family: Arial,
																	sans-serif;
																font-size: 16px;
																font-weight: bold;
																color: #ffffff;
																text-decoration: none;
																border-radius: 5px;
															"
															>View Your Dashboard</a
														>
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>

								<p style="margin: 0 0 25px 0">
									If you have any questions, please reply to this
									email or contact our
									<a
										href="mailto:support@aadyanvi.com"
										style="color: #007bff"
										>support team</a
									>.
								</p>

								<p style="margin: 0">
									Thank you for choosing Aadyanvi Wealth for your
									fixed income investments.
								</p>
								<p style="margin: 20px 0 0 0">Best regards,</p>
								<p style="margin: 0">The Aadyanvi Wealth Team</p>
							</td>
						</tr>

						<!-- FOOTER -->
						<tr>
							<td
								align="center"
								valign="top"
								style="
									padding: 20px;
									background-color: #f8f9fa;
									font-family: Arial, sans-serif;
									font-size: 12px;
									line-height: 1.5;
									color: #6c757d;
								"
							>
								<p style="margin: 0">
									&copy; 2025 Aadyanvi Wealth. All rights reserved.
								</p>
							</td>
						</tr>
					</table>
					<!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->
				</td>
			</tr>
		</table>
	</body>
</html>`,
  };
  return sendEmail(
    BREVO_API_KEY || "",
    BREVO_SENDER_EMAIL || "",
    BREVO_SENDER_NAME || "",
    recipient,
    content
  );
};
