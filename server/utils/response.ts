type ApiResult<T> = {
  code: number
  msg: string
  data: T
}

const DEFAULT_SUCCESS_CODE = 1
const DEFAULT_FAILED_CODE = 0

export const ok = <T>(data: T, msg = 'success'): ApiResult<T> => {
  return {
    code: DEFAULT_SUCCESS_CODE,
    msg,
    data,
  }
}

export const fail = <T>(msg: string, data: T): ApiResult<T> => {
  return {
    code: DEFAULT_FAILED_CODE,
    msg,
    data,
  }
}
