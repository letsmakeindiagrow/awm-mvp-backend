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

export const registrationCompleteMail = async (
  email: string,
  name: string
): Promise<EmailResponse> => {
  const recipient: EmailRecipient = { email, name };
  const content: EmailContent = {
    subject: "Welcome to Aadyanvi Wealth",
    textContent: `Welcome to Aadyanvi Wealth: ${name}`,
    htmlContent: `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta http-equiv="X-UA-Compatible" content="ie=edge" />
		<title>Welcome to Aadyanvi Wealth</title>
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
									Account Registration Confirmation
								</h2>
								<p style="margin: 0 0 25px 0">Dear ${name},</p>
								<p style="margin: 0 0 25px 0">
									Thank you for registering with Aadyanvi Wealth. Your
									account has been successfully created.
								</p>

								<p
									style="
										margin: 0 0 10px 0;
										font-weight: bold;
										color: #212529;
									"
								>
									Next Steps:
								</p>
								<ul style="margin: 0 0 25px 0; padding-left: 20px">
									<li style="margin-bottom: 10px">
										Log in to your account to explore investment
										opportunities.
									</li>
									<li>
										Complete your investor profile for a personalized
										experience.
									</li>
								</ul>

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
															>Go to Your Account</a
														>
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>

								<p style="margin: 0 0 25px 0">
									If you did not initiate this registration, please
									contact our support team immediately at
									<a
										href="mailto:support@aadyanvi.com"
										style="color: #007bff"
										>support@aadyanvi.com</a
									>.
								</p>

								<p style="margin: 0">Best regards,</p>
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
									If you have any questions, please contact us at
									<a
										href="mailto:support@aadyanvi.com"
										style="
											color: #6c757d;
											text-decoration: underline;
										"
										>support@aadyanvi.com</a
									>.
								</p>
								<p style="margin: 10px 0 0 0">
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
