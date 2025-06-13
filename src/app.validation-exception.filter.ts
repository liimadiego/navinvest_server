import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { LanguagesService } from './utils/language.service';

@Catch(HttpException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private languagesService: LanguagesService;

  constructor() {
    try {
      this.languagesService = new LanguagesService();
    } catch (error) {
      console.error('Error initializing LanguagesService:', error);
      this.languagesService = null;
    }
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Verificações de segurança
      if (!exceptionResponse || typeof exceptionResponse !== 'object') {
        return response.status(status).json({
          statusCode: status,
          message: 'Internal server error',
        });
      }

      // Check if the error contains validation messages
      if ('message' in exceptionResponse) {
        // Check if the message is already translated.
        if ('translated' in exceptionResponse && exceptionResponse.translated) {
          return response.status(status).json({
            statusCode: status,
            message: exceptionResponse.message,
          });
        }

        // Translate the message(s).
        let messages = exceptionResponse.message;

        if (Array.isArray(messages)) {
          // Translate messages
          messages = messages.map((msg) => {
            // Verificação de segurança
            if (!msg || typeof msg !== 'string') {
              return 'Invalid message format';
            }

            try {
              return this.translateMessage(msg);
            } catch (error) {
              console.error('Error translating message:', error);
              return msg; // Retorna a mensagem original em caso de erro
            }
          });
        } else if (typeof messages === 'string') {
          try {
            messages = this.translateMessage(messages);
          } catch (error) {
            console.error('Error translating message:', error);
            // Mantém a mensagem original em caso de erro
          }
        }

        return response.status(status).json({
          statusCode: status,
          message: messages,
        });
      }

      // Default response
      return response.status(status).json(exceptionResponse);

    } catch (error) {
      // Log do erro para debugging
      console.error('Error in ValidationExceptionFilter:', error);

      // Resposta de fallback segura
      const response = host.switchToHttp().getResponse<Response>();
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }

  private translateMessage(msg: string): string {
    if (!msg || typeof msg !== 'string') {
      return 'Invalid message';
    }

    // Verificação segura do serviço de linguagem
    if (!this.languagesService || typeof this.languagesService.getPhrase !== 'function') {
      console.warn('LanguagesService not available or invalid');
      return msg;
    }

    try {
      const phrase = this.languagesService.getPhrase(msg);
      if (phrase && typeof phrase === 'string') {
        return phrase;
      }
    } catch (error) {
      console.error('Error getting phrase:', error);
    }

    // Processamento das mensagens específicas com verificações de segurança
    if (msg.startsWith('each value in nested property ')) {
      const _Idx = msg.slice(30).indexOf(' ');
      if (_Idx !== -1) {
        const propertyName = msg.slice(30, 30 + _Idx);

        if (msg.slice(30 + _Idx + 1) === 'must be either object or array') {
          const translatedPhrase = this.safeGetPhrase('INVALID_NESTED_PROPERTY_TYPE');
          return `${translatedPhrase}: '${propertyName}'`;
        }
      }
    } else if (msg.startsWith('All ') && msg.endsWith(' elements must be unique')) {
      const parts = msg.split(' ');
      if (parts.length > 1) {
        const fieldName = parts[1]?.slice(0, -2) || 'unknown';
        const translatedPhrase = this.safeGetPhrase('DUPLICATE_VALUES_NOT_ALLOWED');
        return `${translatedPhrase}: '${fieldName}'`;
      }
    } else if (msg.startsWith('each value in ')) {
      const _Idx = msg.slice(14).indexOf(' ');
      if (_Idx !== -1) {
        const fieldName = msg.slice(14, 14 + _Idx);

        if (msg.slice(14 + _Idx + 1) === 'must be an object') {
          const translatedPhrase = this.safeGetPhrase('INVALID_OBJECT_TYPE');
          if (translatedPhrase && translatedPhrase.length > 1) {
            return `Cada valor do${translatedPhrase.slice(1)}: '${fieldName}'`;
          }
        }
      }
    }

    const _Idx = msg.indexOf(' ');
    if (_Idx !== -1) {
      const msgB4FirstSpace = msg.slice(0, _Idx);
      const msgAfterFirstSpace = msg.slice(_Idx + 1);

      // Mapeamento de mensagens com verificações seguras
      const messageMap: { [key: string]: string } = {
        'must match /^[A-Z]+$/ regular expression': 'INVALID_UPPERCASE_FORMAT',
        'must match /^[A-Z0-9:]+$/ regular expression': 'INVALID_UPPERCASE_ALPHANUMERIC_FORMAT',
        'must be an array': 'INVALID_ARRAY_TYPE',
        'should not be empty': 'FIELD_SHOULD_NOT_BE_EMPTY',
        'must be a string': 'INVALID_STRING_TYPE',
        'must be a positive number': 'INVALID_POSITIVE_NUMBER',
        'must be a number conforming to the specified constraints': 'INVALID_NUMBER_CONSTRAINTS',
        'must be an integer number': 'INVALID_INTEGER_TYPE',
        'portfolio weights sum is greater than 1': 'PORTFOLIO_WEIGHTS_EXCEEDS_MAXIMUM'
      };

      if (messageMap[msgAfterFirstSpace]) {
        const translatedPhrase = this.safeGetPhrase(messageMap[msgAfterFirstSpace]);
        return `${translatedPhrase}: '${msgB4FirstSpace}'`;
      }

      // Verificações adicionais
      if (msgAfterFirstSpace.startsWith('value in nested property ') &&
        msgAfterFirstSpace.endsWith('must be either object or array')) {
        const propertyName = msgB4FirstSpace.split('.')[0] || 'unknown';
        const translatedPhrase = this.safeGetPhrase('INVALID_NESTED_PROPERTY_TYPE');
        return `${translatedPhrase}: '${propertyName}'`;
      } else if (msgAfterFirstSpace.startsWith('must not be greater than ')) {
        const maxValue = msgAfterFirstSpace.slice(25);
        const translatedPhrase = this.safeGetPhrase('FIELD_EXCEEDS_MAXIMUM');
        return `${translatedPhrase} (${maxValue}): '${msgB4FirstSpace}'`;
      }

      if (msgB4FirstSpace.endsWith('.property')) {
        const __Idx = msgAfterFirstSpace.indexOf(' ');
        if (__Idx !== -1) {
          const propertyName = msgAfterFirstSpace.slice(0, __Idx);
          if (msgAfterFirstSpace.endsWith('should not exist')) {
            const translatedPhrase = this.safeGetPhrase('PROPERTY_SHOULD_NOT_EXIST');
            return `${translatedPhrase} '${propertyName}': '${msgB4FirstSpace}'`;
          }
        }
      }
    }

    console.log(`/!\\ Não foi possível traduzir automaticamente a mensagem de erro: "${msg}"\n`);
    return msg;
  }

  private safeGetPhrase(key: string): string {
    try {
      if (!this.languagesService || typeof this.languagesService.getPhrase !== 'function') {
        return key; // Retorna a chave como fallback
      }

      const phrase = this.languagesService.getPhrase(key);
      return (phrase && typeof phrase === 'string') ? phrase : key;
    } catch (error) {
      console.error(`Error getting phrase for key "${key}":`, error);
      return key;
    }
  }
}