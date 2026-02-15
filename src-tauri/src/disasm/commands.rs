use capstone::prelude::*;

use super::types::{DisasmArch, DisasmInstruction, DisasmResult};

fn get_capstone(arch: DisasmArch) -> Result<Capstone, capstone::Error> {
    match arch {
        DisasmArch::Arm => Capstone::new()
            .arm()
            .mode(arch::arm::ArchMode::Arm)
            .detail(true)
            .extra_mode([arch::arm::ArchExtraMode::MClass, arch::arm::ArchExtraMode::V8].iter().copied())
            .build(),
        DisasmArch::ArmThumb => Capstone::new()
            .arm()
            .mode(arch::arm::ArchMode::Thumb)
            .detail(true)
            .build(),
        DisasmArch::Arm64 => Capstone::new()
            .arm64()
            .mode(arch::arm64::ArchMode::Arm)
            .detail(true)
            .build(),
        DisasmArch::X86 => Capstone::new()
            .x86()
            .mode(arch::x86::ArchMode::Mode32)
            .detail(true)
            .build(),
        DisasmArch::X86_64 => Capstone::new()
            .x86()
            .mode(arch::x86::ArchMode::Mode64)
            .detail(true)
            .build(),
        DisasmArch::Mips => Capstone::new()
            .mips()
            .mode(arch::mips::ArchMode::Mips32)
            .detail(true)
            .build(),
        DisasmArch::Mips64 => Capstone::new()
            .mips()
            .mode(arch::mips::ArchMode::Mips64)
            .detail(true)
            .build(),
        DisasmArch::Ppc => Capstone::new()
            .ppc()
            .mode(arch::ppc::ArchMode::Mode32)
            .detail(true)
            .build(),
        DisasmArch::Ppc64 => Capstone::new()
            .ppc()
            .mode(arch::ppc::ArchMode::Mode64)
            .detail(true)
            .build(),
        DisasmArch::RiscV32 => Capstone::new()
            .riscv()
            .mode(arch::riscv::ArchMode::RiscV32)
            .detail(true)
            .extra_mode([arch::riscv::ArchExtraMode::RiscVC].iter().copied())
            .build(),
        DisasmArch::RiscV64 => Capstone::new()
            .riscv()
            .mode(arch::riscv::ArchMode::RiscV64)
            .detail(true)
            .extra_mode([arch::riscv::ArchExtraMode::RiscVC].iter().copied())
            .build(),
        DisasmArch::Sparc => Capstone::new()
            .sparc()
            .mode(arch::sparc::ArchMode::Default)
            .detail(true)
            .build(),
        DisasmArch::SystemZ => Capstone::new()
            .sysz()
            .mode(arch::sysz::ArchMode::Default)
            .detail(true)
            .build(),
    }
}

fn get_min_size(arch: DisasmArch) -> usize {
    match arch {
        DisasmArch::RiscV32 | DisasmArch::RiscV64 => 2,
        DisasmArch::ArmThumb => 2,
        DisasmArch::X86 | DisasmArch::X86_64 => 1,
        _ => 4,
    }
}

#[tauri::command]
pub fn disassemble(data: Vec<u8>, address: u64, arch: DisasmArch) -> DisasmResult {
    let cs = match get_capstone(arch) {
        Ok(cs) => cs,
        Err(e) => {
            return DisasmResult {
                instructions: vec![],
                error: Some(format!("Failed to create Capstone: {}", e)),
            }
        }
    };

    let min_size = get_min_size(arch);
    let mut instructions: Vec<DisasmInstruction> = Vec::new();
    let mut offset = 0usize;
    let mut current_addr = address;

    while offset < data.len() {
        let remaining = &data[offset..];
        let mut found = false;

        match cs.disasm_all(remaining, current_addr) {
            Ok(insns) => {
                for insn in insns.iter() {
                    let insn_addr = insn.address();
                    let insn_size = insn.bytes().len();
                    
                    if insn_addr == current_addr && insn_size > 0 {
                        instructions.push(DisasmInstruction {
                            address: insn_addr,
                            size: insn_size,
                            bytes: insn.bytes().to_vec(),
                            mnemonic: insn.mnemonic().unwrap_or("").to_string(),
                            op_str: insn.op_str().unwrap_or("").to_string(),
                        });
                        offset += insn_size;
                        current_addr += insn_size as u64;
                        found = true;
                    } else {
                        break;
                    }
                }
            }
            Err(_) => {}
        }

        if !found {
            if remaining.len() >= min_size {
                offset += min_size;
                current_addr += min_size as u64;
            } else {
                break;
            }
        }
    }

    DisasmResult {
        instructions,
        error: None,
    }
}

#[tauri::command]
pub fn get_supported_archs() -> Vec<(String, String)> {
    vec![
        ("arm".to_string(), "ARM".to_string()),
        ("arm_thumb".to_string(), "ARM Thumb".to_string()),
        ("arm64".to_string(), "ARM64".to_string()),
        ("x86".to_string(), "x86".to_string()),
        ("x86_64".to_string(), "x86-64".to_string()),
        ("mips".to_string(), "MIPS".to_string()),
        ("mips64".to_string(), "MIPS64".to_string()),
        ("ppc".to_string(), "PPC".to_string()),
        ("ppc64".to_string(), "PPC64".to_string()),
        ("riscv32".to_string(), "RISC-V 32".to_string()),
        ("riscv64".to_string(), "RISC-V 64".to_string()),
        ("sparc".to_string(), "SPARC".to_string()),
        ("systemz".to_string(), "SystemZ".to_string()),
    ]
}
