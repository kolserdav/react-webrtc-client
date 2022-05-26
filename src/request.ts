// eslint-disable-next-line import/no-extraneous-dependencies
import axios from 'axios';

interface RequestProps {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: any;
  responseType?: 'arraybuffer' | 'json' | 'blob';
}

const request = async (props: RequestProps): Promise<any> => {
  const { method, url, body, params, headers, responseType } = props;
  const _headers = { ...headers } || {};
  if (!_headers['content-type'] && !_headers['Content-Type']) {
    _headers['Content-Type'] = 'application/json';
  }
  return new Promise((resolve) => {
    axios
      .request({
        method: method || 'POST',
        url,
        data: body,
        params,
        headers: _headers,
        responseType: responseType || 'json',
      })
      .then((result) => {
        resolve(result.data);
      })
      .catch((error) => {
        if (!error.response) {
          // eslint-disable-next-line no-console
          console.error('Error request', error);
          resolve(1);
        } else {
          resolve(error.response.data);
        }
      });
  });
};

export default request;
