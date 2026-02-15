use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DisasmArch {
    Arm,
    ArmThumb,
    Arm64,
    X86,
    X86_64,
    Mips,
    Mips64,
    Ppc,
    Ppc64,
    RiscV32,
    RiscV64,
    Sparc,
    SystemZ,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisasmInstruction {
    pub address: u64,
    pub size: usize,
    pub bytes: Vec<u8>,
    pub mnemonic: String,
    pub op_str: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisasmResult {
    pub instructions: Vec<DisasmInstruction>,
    pub error: Option<String>,
}
