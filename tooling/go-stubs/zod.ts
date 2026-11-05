export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error }

type ValidatorFn<T = any> = (val: unknown) => SafeParseResult<T>

function ok<T>(data: T): SafeParseResult<T> {
  return { success: true, data }
}

function fail(msg = 'Validation error'): SafeParseResult<never> {
  return { success: false, error: new Error(msg) }
}

function createSchema<T = any>(
  validate: ValidatorFn<T>,
  extra: Record<string, unknown> = {}
): any {
  const base: Record<string, any> = {
    ...extra,
    _validate: validate,
    safeParse(val: unknown): SafeParseResult<T> {
      return validate(val)
    },
    parse(val: unknown): T {
      const res = validate(val)
      if (!res.success) throw res.error
      return res.data
    },
    optional() {
      return createSchema<T | undefined>((val) =>
        val === undefined ? ok(undefined) : validate(val)
      )
    },
    nullable() {
      return createSchema<T | null>((val) =>
        val === null ? ok(null) : validate(val)
      )
    },
    nullish() {
      return createSchema<T | null | undefined>((val) =>
        val === undefined || val === null ? ok(val) : validate(val)
      )
    },
    default(defVal: T | (() => T)) {
      return createSchema<T>((val) => {
        if (val === undefined) {
          return ok(typeof defVal === 'function' ? (defVal as () => T)() : defVal)
        }
        return validate(val)
      })
    },
    catch(fallback: T | ((ctx: { input: unknown; error: Error }) => T)) {
      return createSchema<T>((val) => {
        const res = validate(val)
        if (res.success) return res
        const data =
          typeof fallback === 'function'
            ? (fallback as (ctx: { input: unknown; error: Error }) => T)({
                input: val,
                error: res.error,
              })
            : fallback
        return ok(data)
      })
    },
    transform<U>(fn: (val: T) => U) {
      return createSchema<U>((val) => {
        const res = validate(val)
        if (!res.success) return res
        try {
          return ok(fn(res.data))
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err))
        }
      })
    },
    pipe<U>(nextSchema: { safeParse: ValidatorFn<U> }) {
      return createSchema<U>((val) => {
        const res = validate(val)
        if (!res.success) return res
        return nextSchema.safeParse(res.data)
      })
    },
    refine(check: (val: T) => boolean, opts?: { message?: string } | string) {
      const msg = typeof opts === 'string' ? opts : opts?.message
      return createSchema<T>((val) => {
        const res = validate(val)
        if (!res.success) return res
        try {
          return check(res.data) ? res : fail(msg ?? 'Refinement failed')
        } catch (err) {
          return fail(err instanceof Error ? err.message : String(err))
        }
      }, extra)
    },
    superRefine(
      check: (val: T, ctx: { addIssue: (issue?: unknown) => void }) => void
    ) {
      return createSchema<T>((val) => {
        const res = validate(val)
        if (!res.success) return res
        let hasIssue = false
        check(res.data, {
          addIssue() {
            hasIssue = true
          },
        })
        return hasIssue ? fail('SuperRefine failed') : res
      }, extra)
    },
    or(other: { safeParse: ValidatorFn }) {
      return zUnion([proxy, other])
    },
    and(other: { safeParse: ValidatorFn }) {
      return zIntersection(proxy, other)
    },
    array() {
      return zArray(proxy)
    },
  }

  const proxy: any = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver)
      }
      // Unknown constraint modifiers (.strip(), .strict(), .brand(), .describe(), etc.) return proxy
      return () => proxy
    },
  })

  return proxy
}

function zString(coerce = false) {
  const checks: Array<(s: string) => boolean> = []
  const make = (): any =>
    createSchema<string>(
      (val) => {
        const v = coerce && val !== undefined && val !== null ? String(val) : val
        if (typeof v !== 'string') return fail('Expected string')
        for (const c of checks) {
          if (!c(v)) return fail('String constraint failed')
        }
        return ok(v)
      },
      {
        min(n: number) {
          checks.push((s) => s.length >= n)
          return make()
        },
        max(n: number) {
          checks.push((s) => s.length <= n)
          return make()
        },
        length(n: number) {
          checks.push((s) => s.length === n)
          return make()
        },
        nonempty() {
          checks.push((s) => s.length > 0)
          return make()
        },
      }
    )
  return make()
}

function zNumber(coerce = false) {
  const checks: Array<(n: number) => boolean> = []
  const make = (): any =>
    createSchema<number>(
      (val) => {
        const v = coerce ? Number(val) : val
        if (typeof v !== 'number' || Number.isNaN(v)) {
          return fail('Expected number')
        }
        for (const c of checks) {
          if (!c(v)) return fail('Number constraint failed')
        }
        return ok(v)
      },
      {
        int() {
          checks.push((n) => Number.isInteger(n))
          return make()
        },
        finite() {
          checks.push((n) => Number.isFinite(n))
          return make()
        },
        positive() {
          checks.push((n) => n > 0)
          return make()
        },
        nonnegative() {
          checks.push((n) => n >= 0)
          return make()
        },
        min(m: number) {
          checks.push((n) => n >= m)
          return make()
        },
        max(m: number) {
          checks.push((n) => n <= m)
          return make()
        },
        gte(m: number) {
          checks.push((n) => n >= m)
          return make()
        },
        lte(m: number) {
          checks.push((n) => n <= m)
          return make()
        },
      }
    )
  return make()
}

function zBoolean(coerce = false) {
  return createSchema<boolean>((val) => {
    const v = coerce ? Boolean(val) : val
    return typeof v === 'boolean' ? ok(v) : fail('Expected boolean')
  })
}

function zLiteral<T>(expected: T) {
  return createSchema<T>((val) =>
    val === expected ? ok(expected) : fail('Expected literal')
  )
}

function zEnum<T extends string>(values: readonly T[] | Record<string, T>) {
  const allowed = new Set<unknown>(
    Array.isArray(values) ? values : Object.values(values)
  )
  return createSchema<T>(
    (val) => (allowed.has(val) ? ok(val as T) : fail('Invalid enum value')),
    { options: Array.isArray(values) ? values : Object.values(values) }
  )
}

function zArray(itemSchema: { safeParse: ValidatorFn }) {
  const checks: Array<(arr: unknown[]) => boolean> = []
  const make = (): any =>
    createSchema<any[]>(
      (val) => {
        if (!Array.isArray(val)) return fail('Expected array')
        for (const c of checks) {
          if (!c(val)) return fail('Array length constraint failed')
        }
        const out = new Array(val.length)
        for (let i = 0; i < val.length; i++) {
          const r = itemSchema.safeParse(val[i])
          if (!r.success) return r
          out[i] = r.data
        }
        return ok(out)
      },
      {
        min(n: number) {
          checks.push((a) => a.length >= n)
          return make()
        },
        max(n: number) {
          checks.push((a) => a.length <= n)
          return make()
        },
        length(n: number) {
          checks.push((a) => a.length === n)
          return make()
        },
        nonempty() {
          checks.push((a) => a.length > 0)
          return make()
        },
      }
    )
  return make()
}

function zTuple(schemas: Array<{ safeParse: ValidatorFn }>) {
  return createSchema<any[]>((val) => {
    if (!Array.isArray(val) || val.length < schemas.length) {
      return fail('Expected tuple')
    }
    const out = new Array(schemas.length)
    for (let i = 0; i < schemas.length; i++) {
      const r = schemas[i]!.safeParse(val[i])
      if (!r.success) return r
      out[i] = r.data
    }
    return ok(out)
  })
}

function zObject(
  shape: Record<string, { safeParse: ValidatorFn }>,
  mode: 'strip' | 'passthrough' | 'strict' = 'strip'
) {
  return createSchema<Record<string, any>>(
    (val) => {
      if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        return fail('Expected object')
      }
      const input = val as Record<string, unknown>
      if (mode === 'strict') {
        for (const k of Object.keys(input)) {
          if (!(k in shape)) return fail(`Unrecognized key: ${k}`)
        }
      }
      const out: Record<string, unknown> =
        mode === 'passthrough' ? { ...input } : {}
      for (const [k, fieldSchema] of Object.entries(shape)) {
        const r = fieldSchema.safeParse(input[k])
        if (!r.success) return r
        out[k] = r.data
      }
      return ok(out)
    },
    {
      shape,
      passthrough() {
        return zObject(shape, 'passthrough')
      },
      loose() {
        return zObject(shape, 'passthrough')
      },
      strict() {
        return zObject(shape, 'strict')
      },
      strip() {
        return zObject(shape, 'strip')
      },
      extend(extraShape: Record<string, { safeParse: ValidatorFn }>) {
        return zObject({ ...shape, ...extraShape }, mode)
      },
      merge(other: { shape?: Record<string, { safeParse: ValidatorFn }> }) {
        return zObject({ ...shape, ...(other.shape ?? {}) }, mode)
      },
      partial() {
        const partialShape: Record<string, { safeParse: ValidatorFn }> = {}
        for (const [k, s] of Object.entries(shape)) {
          partialShape[k] = (s as any).optional()
        }
        return zObject(partialShape, mode)
      },
      pick(keys: Record<string, boolean>) {
        const picked: Record<string, { safeParse: ValidatorFn }> = {}
        for (const [k, v] of Object.entries(keys)) {
          if (v && shape[k]) picked[k] = shape[k]!
        }
        return zObject(picked, mode)
      },
      omit(keys: Record<string, boolean>) {
        const omitted: Record<string, { safeParse: ValidatorFn }> = {}
        for (const [k, s] of Object.entries(shape)) {
          if (!keys[k]) omitted[k] = s
        }
        return zObject(omitted, mode)
      },
    }
  )
}

function zRecord(
  first: { safeParse: ValidatorFn },
  second?: { safeParse: ValidatorFn }
) {
  const keySchema = second ? first : undefined
  const valSchema = second ?? first
  return createSchema<Record<string, any>>((val) => {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) {
      return fail('Expected record object')
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (keySchema) {
        const kr = keySchema.safeParse(k)
        if (!kr.success) continue
      }
      const vr = valSchema.safeParse(v)
      if (!vr.success) return vr
      out[k] = vr.data
    }
    return ok(out)
  })
}

function zUnion(schemas: Array<{ safeParse: ValidatorFn }>) {
  return createSchema<any>((val) => {
    for (const s of schemas) {
      const r = s.safeParse(val)
      if (r.success) return r
    }
    return fail('No union branch matched')
  })
}

function zIntersection(
  left: { safeParse: ValidatorFn },
  right: { safeParse: ValidatorFn }
) {
  return createSchema<any>((val) => {
    const lr = left.safeParse(val)
    if (!lr.success) return lr
    const rr = right.safeParse(val)
    if (!rr.success) return rr
    if (
      typeof lr.data === 'object' &&
      lr.data !== null &&
      typeof rr.data === 'object' &&
      rr.data !== null
    ) {
      return ok({ ...lr.data, ...rr.data })
    }
    return rr
  })
}

export const z: any = {
  string: () => zString(false),
  number: () => zNumber(false),
  boolean: () => zBoolean(false),
  literal: zLiteral,
  enum: zEnum,
  nativeEnum: zEnum,
  any: () => createSchema((val) => ok(val)),
  unknown: () => createSchema((val) => ok(val)),
  undefined: () =>
    createSchema((val) => (val === undefined ? ok(undefined) : fail())),
  null: () => createSchema((val) => (val === null ? ok(null) : fail())),
  never: () => createSchema(() => fail('Expected never')),
  array: zArray,
  tuple: zTuple,
  object: (shape: Record<string, { safeParse: ValidatorFn }>) =>
    zObject(shape, 'strip'),
  looseObject: (shape: Record<string, { safeParse: ValidatorFn }>) =>
    zObject(shape, 'passthrough'),
  strictObject: (shape: Record<string, { safeParse: ValidatorFn }>) =>
    zObject(shape, 'strict'),
  record: zRecord,
  union: zUnion,
  discriminatedUnion: (
    _disc: string,
    schemas: Array<{ safeParse: ValidatorFn }>
  ) => zUnion(schemas),
  intersection: zIntersection,
  preprocess: (
    fn: (val: unknown) => unknown,
    schema: { safeParse: ValidatorFn }
  ) =>
    createSchema((val) => {
      try {
        return schema.safeParse(fn(val))
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err))
      }
    }),
  lazy: (getter: () => { safeParse: ValidatorFn }) =>
    createSchema((val) => getter().safeParse(val)),
  coerce: {
    string: () => zString(true),
    number: () => zNumber(true),
    boolean: () => zBoolean(true),
  },
}

export default z
