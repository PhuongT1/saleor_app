import { compileMjml } from "./compile-mjml";
import { ITemplateCompiler } from "./template-compiler";
import { MessageEventTypes } from "../event-handlers/message-event-types";
import { htmlToPlaintext } from "./html-to-plaintext";
import { SmtpConfiguration } from "./configuration/smtp-config-schema";
import { createLogger } from "../../logger";
import { BaseError } from "../../errors";
import { err, ok, Result } from "neverthrow";

interface CompileArgs {
  recipientEmail: string;
  event: MessageEventTypes;
  payload: unknown;
  bodyTemplate: string;
  subjectTemplate: string;
  senderName: string;
  senderEmail: string;
}

export interface CompiledEmail {
  from: string;
  to: string;
  text: string;
  html: string;
  subject: string;
}

export interface IEmailCompiler {
  compile(args: CompileArgs): Result<CompiledEmail, InstanceType<typeof BaseError>>;
}

export class EmailCompiler implements IEmailCompiler {
  static EmailCompilerError = BaseError.subclass("EmailCompilerError");
  static CompilationFailedError = this.EmailCompilerError.subclass("CompilationFailedError");
  static EmptyEmailSubjectError = this.EmailCompilerError.subclass("EmptyEmailSubjectError");
  static EmptyEmailBodyError = this.EmailCompilerError.subclass("EmptyEmailBodyError");

  constructor(private templateCompiler: ITemplateCompiler) {}

  compile({
    payload,
    recipientEmail,
    event,
    subjectTemplate,
    bodyTemplate,
    senderEmail,
    senderName,
  }: CompileArgs): Result<CompiledEmail, InstanceType<typeof EmailCompiler.EmailCompilerError>> {
    const logger = createLogger("sendSmtp", {
      name: "sendSmtp",
      event,
    });

    logger.debug("Compiling an email using MJML");

    const subjectCompilationResult = this.templateCompiler.compile(subjectTemplate, payload);

    if (subjectCompilationResult.isErr()) {
      return err(
        new EmailCompiler.CompilationFailedError("Failed to compile email subject template", {
          errors: [subjectCompilationResult.error],
        }),
      );
    }

    const { template: emailSubject } = subjectCompilationResult.value;

    if (!emailSubject || !emailSubject?.length) {
      logger.error("Mjml subject message is empty, skipping");

      return err(
        new EmailCompiler.EmptyEmailSubjectError("Mjml subject message is empty, skipping", {
          props: {
            subject: emailSubject,
          },
        }),
      );
    }

    logger.debug({ emailSubject }, "Subject compiled");

    const bodyCompilationResult = this.templateCompiler.compile(bodyTemplate, payload);

    if (bodyCompilationResult.isErr()) {
      return err(
        new EmailCompiler.CompilationFailedError("Failed to compile email body template", {
          errors: [bodyCompilationResult.error],
        }),
      );
    }

    const { template: emailTemplate } = bodyCompilationResult.value;

    if (!emailTemplate || !emailTemplate?.length) {
      return err(new EmailCompiler.EmptyEmailBodyError("MJML template body is empty"));
    }

    logger.debug("Handlebars template compiled");

    const { html: emailBodyHtml, errors: mjmlCompilationErrors } = compileMjml(emailTemplate);

    if (mjmlCompilationErrors.length) {
      logger.error("Error during the MJML compilation");
      logger.error(mjmlCompilationErrors);

      throw new Error("Error during the MJML compilation. Please Validate your MJML template");
    }

    if (!emailBodyHtml || !emailBodyHtml?.length) {
      logger.error("No MJML template returned after the compilation");

      throw new Error("No MJML template returned after the compilation");
    }

    logger.debug("MJML template compiled");

    const { plaintext: emailBodyPlaintext } = htmlToPlaintext(emailBodyHtml);

    if (!emailBodyPlaintext || !emailBodyPlaintext?.length) {
      logger.error("Email body could not be converted to plaintext");

      throw new Error("Email body could not be converted to plaintext");
    }

    logger.debug("Email body converted to plaintext");

    return ok({
      text: emailBodyPlaintext,
      html: emailBodyHtml,
      from: `${senderName} <${senderEmail}>`,
      to: recipientEmail,
      subject: emailSubject,
    });
  }
}
