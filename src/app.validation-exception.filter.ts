import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { LanguagesService } from './utils/language.service';

@Catch(HttpException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private languagesService: LanguagesService = new LanguagesService();

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if the error contains validation messages
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      // Check if the message is already translated.
      if ('translated' in exceptionResponse && exceptionResponse.translated)
        return response.status(status).json({
          statusCode: status,
          message: exceptionResponse.message,
        });

      // Translate the message(s).
      let messages = exceptionResponse.message;

      if (Array.isArray(messages)) {
        // Translate messages
        messages = messages.map((msg) => {
          const phrase = this.languagesService.getPhrase(msg);
          if (phrase) return phrase;

          if (msg.startsWith('each value in nested property ')) {
            const _Idx = msg.slice(30).indexOf(' ');
            if (_Idx !== -1) {
              const propertyName = msg.slice(30, 30 + _Idx);

              if (msg.slice(30 + _Idx + 1) === 'must be either object or array')
                return `${this.languagesService.getPhrase('INVALID_NESTED_PROPERTY_TYPE')}: '${propertyName}'`;
            }

          } else if (msg.startsWith('All ') && msg.endsWith(' elements must be unique')) {
            return `${this.languagesService.getPhrase('DUPLICATE_VALUES_NOT_ALLOWED')}: '${msg.split(' ')[1].slice(0, -2)}'`;
          } else if (msg.startsWith('each value in ')) {
            const _Idx = msg.slice(14).indexOf(' ');
            if (_Idx !== -1) {
              const fieldName = msg.slice(14, 14 + _Idx);

              if (msg.slice(14 + _Idx + 1) === 'must be an object')
                return `Cada valor do${this.languagesService.getPhrase('INVALID_OBJECT_TYPE').slice(1)}: '${fieldName}'`
            }
          }

          const _Idx = msg.indexOf(' ');
          if (_Idx !== -1) {
            const msgB4FirstSpace = msg.slice(0, _Idx);
            const msgAfterFirstSpace = msg.slice(_Idx + 1);

            if (msgAfterFirstSpace === 'must match /^[A-Z]+$/ regular expression')
              return `${this.languagesService.getPhrase('INVALID_UPPERCASE_FORMAT')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'must match /^[A-Z0-9:]+$/ regular expression')
              return `${this.languagesService.getPhrase('INVALID_UPPERCASE_ALPHANUMERIC_FORMAT')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'must be an array')
              return `${this.languagesService.getPhrase('INVALID_ARRAY_TYPE')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'should not be empty')
              return `${this.languagesService.getPhrase('FIELD_SHOULD_NOT_BE_EMPTY')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'must be a string')
              return `${this.languagesService.getPhrase('INVALID_STRING_TYPE')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'must be a positive number')
              return `${this.languagesService.getPhrase('INVALID_POSITIVE_NUMBER')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'must be a number conforming to the specified constraints')
              return `${this.languagesService.getPhrase('INVALID_NUMBER_CONSTRAINTS')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'must be an integer number')
              return `${this.languagesService.getPhrase('INVALID_INTEGER_TYPE')}: '${msgB4FirstSpace}'`;
            else if (msgAfterFirstSpace === 'portfolio weights sum is greater than 1')
              return `${this.languagesService.getPhrase('PORTFOLIO_WEIGHTS_EXCEEDS_MAXIMUM')}: '${msgB4FirstSpace}'`;

            if (msgAfterFirstSpace.startsWith('value in nested property ') && msgAfterFirstSpace.endsWith('must be either object or array'))
              return `${this.languagesService.getPhrase('INVALID_NESTED_PROPERTY_TYPE')}: '${msgB4FirstSpace.split('.')[0]}'`;
            else if (msgAfterFirstSpace.startsWith('must not be greater than '))
              return `${this.languagesService.getPhrase('FIELD_EXCEEDS_MAXIMUM')} (${msgAfterFirstSpace.slice(25)}): '${msgB4FirstSpace}'`;

            if (msgB4FirstSpace.endsWith('.property')) {
              const __Idx = msgAfterFirstSpace.indexOf(' ');
              const propertyName = msgAfterFirstSpace.slice(0, __Idx);
              if (msgAfterFirstSpace.endsWith('should not exist'))
                return `${this.languagesService.getPhrase('PROPERTY_SHOULD_NOT_EXIST')} '${propertyName}': '${msgB4FirstSpace}'`;
            }
          }

          console.log(`/!\\ Não foi possível traduzir automaticamente a mensagem de erro: "${msg}"\n `);

          return msg;
        });
      }

      return response.status(status).json({
        statusCode: status,
        message: messages,
      });

    }

    // Default response
    response.status(status).json(exceptionResponse);
  }
}