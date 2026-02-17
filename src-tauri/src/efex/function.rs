use crate::efex::error::EfexError;

pub struct EfexFunction;

impl EfexFunction {
    pub fn new() -> Self {
        EfexFunction
    }

    pub fn fes_down_with_progress<F>(
        &self,
        buf: &[u8],
        addr: u32,
        progress_callback: F,
    ) -> Result<u64, EfexError>
    where
        F: FnMut(u64, u64),
    {
        let mut ctx = libefex::Context::new();
        ctx.scan_usb_device()?;
        ctx.usb_init()?;
        ctx.efex_init()?;

        ctx.fes_down_with_progress(buf, addr, libefex::FesDataType::Flash, progress_callback)
            .map_err(EfexError::from)
    }

    pub fn fes_verify_value(
        &self,
        addr: u32,
        size: u64,
    ) -> Result<libefex::FesVerifyResp, EfexError> {
        let mut ctx = libefex::Context::new();
        ctx.scan_usb_device()?;
        ctx.usb_init()?;
        ctx.efex_init()?;

        ctx.fes_verify_value(addr, size).map_err(EfexError::from)
    }
}

impl Default for EfexFunction {
    fn default() -> Self {
        Self::new()
    }
}
