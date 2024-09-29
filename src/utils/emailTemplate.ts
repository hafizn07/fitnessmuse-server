interface EmailTemplateOptions {
  title: string;
  bodyContent: string;
  buttonText?: string;
  buttonLink?: string;
  mpin?: string;
  gymName?: string;
}

/**
 * Generates a dynamic email template with customizable content and styles.
 * This template includes a title, body content, a call-to-action button,
 * and the name of the gym/app for a consistent branding experience.
 *
 * @param options - An object containing the following properties:
 * @param options.title - The title of the email (e.g., "Verify Your Email Address").
 * @param options.bodyContent - The main content of the email, which can include a greeting and instructions.
 * @param options.buttonText - The text displayed on the call-to-action button (e.g., "Verify Email").
 * @param options.buttonLink - The URL that the button will link to, typically for a verification or confirmation action.
 * @param options.gymName - The name of the gym or app sending the email, used for branding purposes in the footer.
 *
 * @returns A string containing the HTML structure of the email template, ready to be sent.
 */
export const generateEmailTemplate = (
  options: EmailTemplateOptions
): string => {
  const { title, bodyContent, buttonText, buttonLink, mpin, gymName } = options;

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #333;">
      <h2>${title}</h2>
      <p>${bodyContent}</p>

      ${gymName ? `<p>You've been invited by <strong>${gymName}</strong> to join as a trainer!</p>` : ""}

      ${
        mpin
          ? `
      <div style="
        background-color: black;
        color: white;
        font-size: 24px;
        text-align: center;
        padding: 10px 20px;
        border-radius: 8px;
        margin: 10px 0;
      ">
        ${mpin}
      </div>`
          : ""
      }

      ${
        buttonText && buttonLink
          ? `
      <p>
        <a href="${buttonLink}" 
          style="
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            text-decoration: none;
            border-radius: 5px;
          ">
          ${buttonText}
        </a>
      </p>`
          : ""
      }

      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br/>${gymName ? `${gymName} Team` : "Your Team"}</p>
    </div>
  `;
};
