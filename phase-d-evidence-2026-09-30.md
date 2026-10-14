# BLOQUE 1 — INVENTARIO DE DATOS CRUDOS
COMANDO: ls -la .engine/
```text
total 0
drwxr-xr-x@  28 User  staff    896 Sep 30 11:45 .
drwxr-xr-x@  31 User  staff    992 Sep 30 14:19 ..
drwxr-xr-x@  10 User  staff    320 Sep 30 11:14 22bet-verification
drwxr-xr-x@   5 User  staff    160 Sep 30 10:58 batch
drwxr-xr-x@  18 User  staff    576 Sep 30 10:57 betano-verification
drwxr-xr-x@   8 User  staff    256 Sep 30 10:58 betsson-co-retry
drwxr-xr-x@  15 User  staff    480 Sep 30 11:26 betsson-verification
drwxr-xr-x@  41 User  staff   1312 Sep 30 10:55 brazil-diagnostic
drwxr-xr-x@   4 User  staff    128 Sep 30 11:26 changes
drwxr-xr-x@   9 User  staff    288 Sep 30 10:58 changes-verification
drwxr-xr-x@  37 User  staff   1184 Sep 30 11:27 colombia-diagnostic
drwxr-xr-x@  11 User  staff    352 Sep 30 11:05 fightodds-verification
drwxr-xr-x@  10 User  staff    320 Sep 30 11:14 melbet-betwinner-verification
drwxr-xr-x@ 365 User  staff  11680 Sep 30 11:29 memory
drwxr-xr-x@  13 User  staff    416 Sep 30 10:56 mexico-handoff
drwxr-xr-x@  33 User  staff   1056 Sep 30 11:27 mexico-verification
drwxr-xr-x@   9 User  staff    288 Sep 30 11:02 onexbet-second-attempt
drwxr-xr-x@  10 User  staff    320 Sep 30 10:58 onexbet-verification
drwxr-xr-x@  38 User  staff   1216 Sep 30 11:26 peru-diagnostic
drwxr-xr-x@  12 User  staff    384 Sep 30 11:26 pinnacle-verification
drwxr-xr-x@ 399 User  staff  12768 Sep 30 11:45 raw
drwxr-xr-x@   4 User  staff    128 Sep 30 10:56 scheduler
drwxr-xr-x@   7 User  staff    224 Sep 30 10:57 scheduler-verification
drwxr-xr-x@   7 User  staff    224 Sep 30 11:17 sessions
drwxr-xr-x@  22 User  staff    704 Sep 30 11:24 stake-persistent
drwxr-xr-x@   7 User  staff    224 Sep 30 11:02 tencric-diagnostic
drwxr-xr-x@   5 User  staff    160 Sep 30 10:57 ui
drwxr-xr-x@  10 User  staff    320 Sep 25 18:52 verification
```
EXIT: 0
COMANDO: ls -la .engine/raw/ 2>&1 | head -200
```text
total 186208
drwxr-xr-x@ 399 User  staff    12768 Sep 30 11:45 .
drwxr-xr-x@  28 User  staff      896 Sep 30 11:45 ..
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 0060019c621910f6c7c5f6d896571783367741b6b9dc5c743a3d6785ade18655-2026-09-26T03-22-10-022Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 0258b3efea9558e76cac0b8314753ad695f24d3b807d8fac52131f67e94548d8-2026-09-26T03-11-10-117Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 03b7aa187c9f807a4d2a7290272714cc12d40f5fbd01b1ce73f7d7515cd04d33-2026-09-26T03-04-11-159Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 04921f35417d9ca5ec50a48e00d172817b4c7fa3859437962a8620b5c756c201-2026-09-26T03-18-25-417Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 04dde5efe5d80ce3e3e32368552ee395bdb88c288f32dd9f542152bea26e4a30-2026-09-26T03-11-21-506Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 056355036c00b9a1b889270dd626f6dac4f1d38542897ee985ec129158a790d4-2026-09-26T03-13-21-557Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 05f09dac180b0455437160606f11c3ca475ad33c67a93c4ee22fb9d1d9b1ffad-2026-09-26T03-08-53-607Z-failure
-rw-------@   1 User  staff  2590199 Sep 26 16:49 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790416174297-network.json
-rw-------@   1 User  staff  2473524 Sep 26 17:56 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790420191947-network.json
-rw-------@   1 User  staff  2504556 Sep 26 18:02 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790420562062-network.json
-rw-------@   1 User  staff  2510274 Sep 26 18:05 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790420742562-network.json
-rw-------@   1 User  staff  2498670 Sep 26 18:08 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790420932274-network.json
-rw-------@   1 User  staff  1363411 Sep 27 06:55 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790466918951-network.json
-rw-------@   1 User  staff   523820 Sep 27 11:37 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790483832909-network.json
-rw-------@   1 User  staff  1254943 Sep 27 11:39 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790483943274-network.json
drwxr-xr-x@   9 User  staff      288 Sep 30 11:05 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-2026-09-26T09-46-26-898Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-2026-09-26T10-38-08-549Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:26 0641baf8b6134ce00ccc73d20dbba801612dd9f59f36e14f5111631e74cdd3a8-2026-09-27T11-06-09-691Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:26 06d05410678c68a97ce87d4843883925f1f4ab5b41af7203f9e8de485a5dafe6-2026-09-30T04-24-17-423Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 06e02e833af0fdcf683e395c07001e91a10a51959784f4d127a00d862b8ad14b-2026-09-26T03-12-29-756Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 0758cb9311f3e5447d2ca2080eabe8c84319cc0afad7fbfecd6b5dea6744758c-2026-09-26T03-12-56-259Z-failure
-rw-------@   1 User  staff   813492 Sep 27 19:42 0803491c60ef623026ea404c71dfb53e50ef5d1073ebb43e183d866c6a7e5ed1-1790512972457-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 0869aec289227460cfc3f38e9bd1a67dc6fa2c597d650e6e3e11af733094d424-2026-09-26T03-08-49-548Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 097b094ce33b3de5c4079329c6cdd75c2b093e5e96bf37e935684a46a5a20470-2026-09-26T03-05-48-597Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:02 0a3c068ecc815ffe86cf6c99298dee5422ad6f79bc875438793deab473b69332-2026-09-26T03-52-58-242Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:03 0a4480315cfd68f259c1e5aafb38c13fcdc864c27c6971b1466b66757d593fbb-2026-09-26T03-03-48-388Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:02 0b06393c57af59ab925db9a7227cab155e0bf403dd28549b8a5a4498c104b10e-2026-09-26T03-02-43-526Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 0b5e14b0e89f4d1a1fe98035dfd6aa9d863c9ce6bade91ea91c741c7c402bae8-2026-09-27T10-24-51-165Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 0b99783c8e848a5079ce84282e4f7a5aa7e9d6a934fdaa9c5fd6c96b557179c9-2026-09-26T03-05-26-206Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:02 0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 0cf241ec57f13992b40d6f154dad5da35fde1bc92f0641d78309d0ee164f63ae-2026-09-26T03-21-40-703Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 0d4a49123535d7e62ed4debef57ee9db2ac89701578e922dbce49b891e81a9b4-2026-09-28T06-34-48-500Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 0d4fa83013bcce81674f63e85dc5f83c105cd1be2f7a0a221222a9999c7b68b2-2026-09-26T03-22-39-098Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 0e45537efa80351b352ee8177e629d09df28ae4fa4187b76a840fd0a993b2b7f-2026-09-26T03-14-28-821Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 108336ca4b4400e260268c095fc38089a42e040498f80d880f9f660c1940f661-2026-09-27T10-25-26-643Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 108966c7da2ebd67a297b53268be784de97c423075fe39d807ea49671087657f-2026-09-26T03-21-21-867Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 13d532e81457201097aed9416ef63cd0f62d70174b750a32a2f033304d7ffaa3-2026-09-26T03-21-36-999Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 14c6474b905a055abba7ce6bbbfeaf2e953f77331d3a1dd2c42604be753d3e4a-2026-09-26T03-18-40-215Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 1595da0b0da87f15beef45999335354cd457c9e4942f666d9b9f318dfd1ce8de-2026-09-26T03-20-30-953Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 15cfdc4fac99e11a31a41c5dc643b34e11cc2509bca99c6ab1d98a80fc76d874-2026-09-27T10-24-58-125Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 1605989ceece43e4ae539b0e53d552467a5106ce1551baa6376a08efe220656d-2026-09-26T03-14-17-405Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 1644c64e813418a3f49b9411a9168fa724252b4e9aa10d2befe24e2da5ae6e2e-2026-09-26T03-05-44-918Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 17c85b0772ebe6a923ec406955998a3b2c3a22556b878037ad7a7f27f7a1c1a0-2026-09-26T03-22-02-342Z-failure
-rw-------@   1 User  staff  2277126 Sep 26 11:38 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790397504048-network.json
-rw-------@   1 User  staff  3703562 Sep 26 17:37 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790419054484-network.json
-rw-------@   1 User  staff  4022757 Sep 26 17:56 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790420162099-network.json
-rw-------@   1 User  staff  4380934 Sep 26 18:02 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790420533854-network.json
-rw-------@   1 User  staff  4380934 Sep 26 18:05 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790420707715-network.json
-rw-------@   1 User  staff  4380934 Sep 26 18:08 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790420904337-network.json
-rw-------@   1 User  staff  4877853 Sep 27 06:54 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790466890729-network.json
drwxr-xr-x@   9 User  staff      288 Sep 30 10:58 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-2026-09-26T04-34-35-503Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:14 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-2026-09-27T04-38-34-043Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 18eec8f6f46db19b584597bc76ae8b065432b266db0ab1464a31cf56203ca24d-2026-09-26T03-07-11-459Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 1b2726d90804096b2d9a66f1bd2b85754347aa57a9f8552ec5fe6f4355610b34-2026-09-26T03-11-52-041Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 1c1a74a77319ce9af82026a883ff561cfa81237188f0d66bdf65792519a3764f-2026-09-26T03-10-41-494Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 1c26c2fd1f0053d6ccde1233c63ecfc35c093856ed553bc15805aeaaf0727629-2026-09-26T03-23-08-631Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 1c57c20fff4c167733466c8f2b54b7b4a23f20a37bdbe0850711c0e45e523169-2026-09-26T03-20-03-048Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:04 1d64526cc5619f0e7443280528b1754608ef2ef9d2ec22b2c5c3f8ef9adddf8c-2026-09-26T03-04-22-360Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 1f194ac306a5776b0a8df6b979f7616df0bbcd2dba7756af08550d8e9e7215e3-2026-09-26T03-14-47-575Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 20bd33e21391ef50062876d7a343f18c58f65bbd10f2f09d55ba989c5d019ee0-2026-09-26T03-08-42-038Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 2106c7f51c0f6f31db88a33488c00fc3a1809fe81f859cad7bcc9a2fce7f8a8b-2026-09-26T03-09-14-917Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 212e2bfc27024a34ee64f3bfa64f9fc9409679c547ecafaa2fc9a72b0a49fa03-2026-09-26T03-06-18-451Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2265bc80a709cbfe48e93f50f8d306287dc5508c5b07dfa23a9c7938e4a975cc-2026-09-26T03-21-10-627Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 22c8211db1acfdb889e1c760d2fc01c80e683b0ef5b9ff0b02af93005857c7d7-2026-09-26T03-09-11-056Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 240291af7af8734e762f5bedfa1d323f166335090db1c74ee959673bfd1ccf77-2026-09-26T03-22-46-765Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2494842d584819edbd7c02b200f2dca86a194499b65f1014321d101048c7d2a3-2026-09-26T03-09-33-912Z-failure
-rw-------@   1 User  staff     2765 Sep 30 10:57 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790740641615-network.json
-rw-------@   1 User  staff   742637 Sep 30 10:57 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790740664894-network.json
-rw-------@   1 User  staff   743655 Sep 30 10:58 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790740712658-network.json
-rw-------@   1 User  staff  1345460 Sep 30 11:08 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741305158-network.json
-rw-------@   1 User  staff  3892046 Sep 30 11:12 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741574645-network.json
-rw-------@   1 User  staff  5373780 Sep 30 11:14 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741641268-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-2026-09-30T03-53-54-979Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2854a1746395bb3d11b1599bd36605673d2eaa8a63aeb4bf53e1ea6b0f4635e4-2026-09-26T03-21-33-176Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 285cebde3f04d8c9a7178563c17afca81c3e2147acbcf76273e0687acf02b556-2026-09-26T03-09-48-573Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 29202e9b0a185b7c1ea24828f483f2e5965950999cb466759d4f056a22a9aaee-2026-09-26T03-11-55-828Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 2923d757681e7e4733bc8d9581d001c08c16afb4c224347ef581bfa56f6572bc-2026-09-26T03-22-53-171Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2936bd032abb95fb9e7d1f49460611de01d380e16ab099d4a743be6da2c4cdc1-2026-09-26T03-10-37-781Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 2a806f1be88627685585babc2d14b497c938cec6fe65d82f9feaae482163f97d-2026-09-26T03-05-22-498Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2a8cf6c4307d16f5ae924aed415cd50a2cf64926d9d3f0f627ed704cbec49285-2026-09-26T03-10-14-589Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:02 2ac53fec9262defde87d2bced7db878ed251b2637dddbc0f54b0cca9b43fc2ac-2026-09-27T10-16-07-371Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2ac572d6e50f83cfdaefa5ad18788779270a0f2cb0fcf457fab901289f2a2a18-2026-09-26T03-16-37-207Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:28 2b44d2229a2d63b76b7fa39392b2b38071f84ff2b40d3e702cea90c6a6cafc94-2026-09-30T04-26-52-854Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2cb665492cdc3c9680ca8a7b01d57b6c4d57c9db05ffa8890cb6dc07604d8195-2026-09-26T03-11-02-841Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2e00e8a12d38a9a21e623c54446a80116d22330ad31c143ee0cb70b602e3ab44-2026-09-26T03-09-18-596Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 2e38fc44534ed375a966695e2d6097dad07c5a7b0aacd8a029e42d5189b04310-2026-09-26T03-12-52-574Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:05 2f2f6b98f792016328319bd011296bc38389f444a7bd37c317984490b7974d1d-2026-09-26T03-23-30-413Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:05 2f759b3bc377b98cd1d9a8ba988dc1e379a9c1e173331e31a01e21a77fa35b62-2026-09-26T03-22-17-092Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:03 2fb0e7df38caac9bd8cd472fde4d99d5f1ae8d09153844ea8c4ad09762391f9d-2026-09-26T03-02-58-249Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 2ff544421ca41e8006758d0f90dd5645e7f3795cdbdadf8e053f8d4b265fe650-2026-09-27T10-27-06-554Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 326d7d86db23f31ad3432d7593de00fef8bb62d558815d1f802802e0d3f0fccd-2026-09-26T03-07-26-844Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 33a437f750112e158ec241c1269fbc7e36307b59d552333c0c2c6a8d76f47b80-2026-09-26T03-15-02-257Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3400732a893f7b5e7f844fe62686664c1711eb3bb1382d1e4cf980fdb0b38b21-2026-09-26T03-20-14-213Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 35b42888090eae7b2699cf9da6a886c02927fafe08f10bab73b61f849010b75a-2026-09-26T03-22-06-179Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3610406a8a35ff59423d520116fbb030fa97b45e82f8641e8776fec8427a7cbb-2026-09-26T03-20-27-302Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 37ecf0a1e92de20faf05dd824a12d2dd92d77e871d9b603b12353e26b994bf11-2026-09-26T03-09-37-707Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 37f2ba42414503255cb0bc0f21f0ec993acf75ec887a4c5d2590791342a6deaa-2026-09-26T03-05-07-725Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 38cb989e2f47dd6a8cdaa10d987dd9b8943066f365d6a2226cfd54ef91af6bd3-2026-09-27T10-24-53-829Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:05 395d70fe436f0960a96a8e3dad4cee63a68225615e41db355fe8083041788165-2026-09-26T03-23-58-936Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 396ab4a4b9c8a72eb41f8b0e3898cada53fcc924c405804bb05f7a2ba5f56b69-2026-09-26T03-21-00-594Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3a582b53acb8e6b8d7ba9ef4d7747bd728d801d83fe1d3709df6f9664f42c35a-2026-09-26T03-22-35-361Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3b01eb0d609ae5e40c728f9aef636b204f4148951b3f8369da1700782e09ff26-2026-09-26T03-14-54-924Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 3b1861dc4277f7f15ff568496b9bb2d4bca63803eda94e2899a45759f28635df-2026-09-26T03-16-03-810Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3bd1703cb4994589881c49e268d8a42e6e0a22f0bcb06ef42354a767506c75aa-2026-09-26T03-16-33-496Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3d0f0c4076d7d16f5b299945aeddba2dbc87aca7a28c49780f99586263a56741-2026-09-26T03-21-29-474Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3d8073349700ef8e6b3ffa75e32e3955e94adee3c61e51c72b8a250f383097b0-2026-09-26T03-12-25-928Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3deb2d2176ab4084e85ea0c8d86df97b22a41b11edce90c17b84b7584ec58a55-2026-09-26T03-11-28-917Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 3eda3e4475e060a192f65fe822c34d34b70126ec929636ebbda984cd67c824c7-2026-09-26T03-20-45-764Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 42089f96c378c750ad024e40fabf316e3c2bdb0ff489ab88e4d6234ea8703703-2026-09-26T03-05-37-419Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 44163116a00a384e80dd2279ca11b1db5f2a969a7ae12bd84c11ca98544cbb27-2026-09-26T03-05-11-400Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 44a264d5a28fadaa153d915e67695840dfe7270ec5bcdd0f14c893baff864294-2026-09-26T03-19-39-379Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 45ca602bb4d8a71ec2a025cdf25b343d1b30ece7a28e848d826b1392928d3ffe-2026-09-26T03-18-29-110Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 4660dff78e9f6757e615cc31df75934c60e011039156b95981da3c99fcfe0fb6-2026-09-26T03-21-06-980Z-failure
drwxr-xr-x@   9 User  staff      288 Sep 30 10:57 480f794de2a1b826a76c68cfc75304dccb145d64be4b79ca1f097292ceb84d7c-2026-09-26T09-41-18-343Z-failure
drwxr-xr-x@   9 User  staff      288 Sep 30 11:05 480f794de2a1b826a76c68cfc75304dccb145d64be4b79ca1f097292ceb84d7c-2026-09-26T09-45-28-355Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:02 492fd358a32f9b13eb106f438b54378cf6efc2c0a3c9d691eff436bf630368ac-2026-09-26T03-02-54-490Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 4936891ea5129a3962640cebc9122701c0431b0e25cdfde8ab73d4b60c86f332-2026-09-26T03-16-07-480Z-failure
-rw-------@   1 User  staff  7511920 Sep 27 19:42 497d3df91e07c66b32f88e6daf25245838fe89def144f92a6f61b063accc980e-1790512978557-network.json
drwxr-xr-x@   7 User  staff      224 Sep 26 10:04 4bd32e6f92bfe6876c8106e36c65f81a9fdfcd73e2e4c674d1d6e42a23da7555-2026-09-26T03-03-55-657Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:26 4bf1b3e6df078d5c7fa28fa50d954966e5b56876603ad9bb3d70a9e0e0871198-2026-09-30T04-23-36-648Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 4cfa598615dba77f7a2e18d53acae7790f9bbe44f2c55f2bfc63a2a03a3403f9-2026-09-27T10-09-31-387Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 4d06b69f5db29022a6b95e1dcb7738dbb80b46ca6f00d3a04d374fe9e44c2b3d-2026-09-26T03-13-52-347Z-failure
-rw-------@   1 User  staff  4183623 Sep 29 14:02 4d9056c25203a016956012fe16a66f694b7b8599154340ffa99ba3593d35a9ab-1790665357178-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 11:26 4db04877a4686bfce109c1ea3ba61089fc9d9a8841baca9ac2857afd948b5575-2026-09-30T04-23-16-048Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 4dc211639893393f5e15c678813c159b53089950cf78edd1c35d9f40ca4453e6-2026-09-26T03-05-41-086Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 4ec98e2e1713a74bc7affffb97eb686f7182d88f9653131e9983e578be964836-2026-09-26T03-05-15-191Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:26 5084a63b8949092b127ac21b5e963974ea70a7f8135a1ed8482f346766c6e0e5-2026-09-30T04-23-55-243Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 53581623e18731487b2058d25ff0f73de5806ee3b49d01df87a060d35493addc-2026-09-26T03-15-23-531Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 53ea31ae95ddf68edd76b22c707fb4a20152f032396a336fb3a70b4a86fd85d8-2026-09-26T03-20-56-856Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 543cbfa76616ae3813e3ab5f6d67363908d3a6106bccc6adabe12c8ca3191ae1-2026-09-26T03-14-06-414Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 555374132fc5defdecde365c71610b64e74ce1b01f0a7baf6a0a03102fc2fd48-2026-09-26T03-11-13-890Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 59bea850b78b40d146245fa45bf738e798fd54f668ed986295530ea55d2207b5-2026-09-26T03-15-16-165Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5af6937ed86182455a116b0807d9838f9ae2b17aafe9a2177c6b4375409c6828-2026-09-26T03-18-51-865Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5b2505f3a8ba81e40875629c4f1a7896663cc0f34a0e9aa6cff1deb67913479f-2026-09-26T03-13-05-672Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5c135cc605ffe49b53b5ddfa0df6a4432f1ef46e31ee3e08c37ba173dd900f0b-2026-09-26T03-12-22-093Z-failure
-rw-------@   1 User  staff   797548 Sep 26 10:48 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790394513408-dom.json
-rw-------@   1 User  staff   799106 Sep 26 17:37 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790419025456-dom.json
-rw-------@   1 User  staff   799116 Sep 26 17:55 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790420133844-dom.json
-rw-------@   1 User  staff   799104 Sep 26 18:01 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790420507766-dom.json
-rw-------@   1 User  staff   799117 Sep 26 18:04 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790420682111-dom.json
-rw-------@   1 User  staff   799116 Sep 26 18:07 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790420877730-dom.json
-rw-------@   1 User  staff   796825 Sep 27 06:54 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790466864044-dom.json
-rw-------@   1 User  staff   796895 Sep 27 11:37 5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790483879858-dom.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5c3bfdb8a061f06e5dccfddfacfd38a612d228b6668d81fb82710c6e384643cf-2026-09-26T03-07-15-260Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5d6b6dda2b952c66a08215f461fb976df498eb7e31a33171ff29f7140774fc9b-2026-09-26T03-23-12-383Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5ddae3ea8cdb6ee980fdcaefbcbc4c969580fec849e867b402213a9d10a55032-2026-09-26T03-14-36-962Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:03 5df714049ddd181559482594d64ce55f00d6172e262fdc774aa6b3ef93f89b56-2026-09-26T03-03-05-568Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:54 5e466f4fd0f6c7d4d7d3abb8777bbed335d8bb1b7b7503602e436bd20f7688f4-2026-09-26T03-05-52-260Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 5e4a06bb863e40af83448ba48e3f646cd8765f24906eaebe3b666d62de997c66-2026-09-26T03-19-54-473Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 5f4fa417b3e8f7bce601bad74a2d8d9abde025e1ce0eec2a5556f736ea54aa5a-2026-09-26T03-21-48-208Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 5f7df4958b5861988c66dfbe7dcebf639a3b5af41a904f2a7f9d658e14b21723-2026-09-26T03-12-07-027Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 603bd1076ed5a30a538025b28c9790f51e6e651d435bf51069d201a7544435e2-2026-09-26T03-14-33-318Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 6067fbb25ec02c7fa3400cd665ab217cb6bf89463a5971a1a3765e714fb60607-2026-09-26T03-16-14-931Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 608a9c057f81d37ceda5cadc3819b018b230fe7160c428694776c8eb425eb0a5-2026-09-26T03-12-18-241Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 60d5cbd06addd55be955f7c9958e1b75e990ef5529498f716a83d9dc98b2ad55-2026-09-26T03-14-51-290Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 61615c3a40d69983ff69793af2715edb5964dcd888a34bdb90905c3b8fdb4a61-2026-09-27T10-10-15-100Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 61c0999c4774f7274238895df5e349c6f2d107d73b24409fd450cc9a518c7033-2026-09-26T03-18-48-028Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:03 62a37f4444dacdd0ff1a1e2f804ff08ac72170fc24197c89b07adfed6a96a16f-2026-09-26T03-03-20-971Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 62a6b1914e212c5d94ad4bf74fee88d6e0a9e7d833c61a8403d840e5f0b97d65-2026-09-26T03-14-43-858Z-failure
-rw-------@   1 User  staff   317516 Sep 27 17:33 62a98c9e5852b44e47b01365555777ba62d52c63b827de4e6a3031d511eb164a-1790505211050-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 62a98c9e5852b44e47b01365555777ba62d52c63b827de4e6a3031d511eb164a-2026-09-27T10-27-03-142Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 62fd71b0c270763e2a688891ae5f8a11d7245c4d76f84654fb7bce6120868dbf-2026-09-26T03-13-12-976Z-failure
-rw-------@   1 User  staff    64761 Sep 28 13:55 63537ca07eaac82d257edd157fce33ec1a16cc4c3e37fa6afa1effd2d4490a17-1790578534852-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6372e0adfe1b9d7d0c6370abed0b9a8732d621a70ae9841a1b0d1cf178bb2561-2026-09-26T03-23-15-997Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6445f892d6d3db2a5c0bdc41fb9c420dde9e1be023ae7564c09059c8b2eda63b-2026-09-26T03-08-23-056Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6541d8ae8194656901c0d5907dd8d52381c1a78ae97ada1797917ec6e377ad58-2026-09-26T03-15-05-986Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 65ab18dae7751723e6bcc853895b74a432bf86704190617fd01516582cd975ed-2026-09-26T03-23-44-926Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:11 65b7128f6870db2ff4aad9b6422aa940154f9b60e21fe263a2b6145a0f464918-2026-09-26T03-03-43-782Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:05 683bb0661b67446d62d9097434e4038bf1c4b0b47b60da2dae2e1af0eeb43c07-2026-09-26T03-24-13-838Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 68d14ee70dc0d7ae637de04a9b7679cd318f9ec90be0802676d25f90c2cd77c2-2026-09-26T03-15-31-047Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 69365748ab68ddb6b20c091fb61e0eed89ef895cc81600427c36f4c8b69a3311-2026-09-26T03-12-37-208Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 6a82a3f49144d3ae67bf19b76588d0d780bd775dccb16129155af298c232e2cd-2026-09-26T03-23-22-991Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:11 6acd554c29231439caa52f1742395d54005d34c815adb75318034b895fb3fc07-2026-09-26T03-04-03-051Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6b2c80026e8568d9c7c355bc82b0c21add8b60e54a3c34f661d49f962d13f853-2026-09-26T03-08-26-951Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:27 6bb7cb040f6d1ff811e68ad754bc92e0447018593c6061d1a3f7fd5a4db6d20e-2026-09-30T04-26-16-562Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6bfc9e11cd457497c85a04e79a2dae4c2495a4f48dfc979907a1167831dcee42-2026-09-26T03-07-30-553Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6dd24eec3bf8f479f7cc85b4792d23013d17662af6a2c5669a388d6a6954babb-2026-09-26T03-20-53-143Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 6dd8c889d6cffd4de9b94c443f14ec3e23868de273d070d48227cd1ca40feb66-2026-09-26T03-15-49-648Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 26 10:04 70d4c83c2b9b36c20a3a7b1f07587b71e5cbf8d48e312bc3750432988126160f-2026-09-26T03-04-35-691Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 742008bb949bae75f29cc4621f0113095645e78ed8e4a0cc88ae2757b4979d0d-2026-09-26T03-13-35-374Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:45 749dee89cbf729736ac119a4e395142b0800f29ab6d4ab7ef5b858ed670bd2d9-2026-09-26T03-17-51-632Z-failure
-rw-------@   1 User  staff  4032394 Sep 30 09:58 75dbe59408b52d0b9cee615456a2cf871d3025b9caff411c39249d0e7e85b387-1790737092222-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 76523c71585ce089991d06b195685fda29e1e40fa1142373f9bae4f6b3e0484b-2026-09-26T03-17-59-018Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:02 76db39f404c58a9c0e0584f1c5496f31d1d2e99848eee5bdd24d0294b603a3f2-2026-09-26T03-13-28-049Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 11:14 76db8066a4b3da4293e0dcbcea95e18038d76c401d2b1181164180bd666da6e5-2026-09-26T03-04-59-924Z-failure
-rw-------@   1 User  staff   140000 Sep 27 17:22 7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-1790504571437-network.json
-rw-------@   1 User  staff   140000 Sep 27 17:24 7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-1790504685041-network.json
-rw-------@   1 User  staff   140000 Sep 27 17:33 7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-1790505209364-network.json
drwxr-xr-x@   7 User  staff      224 Sep 30 10:58 7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-2026-09-27T10-15-48-693Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 792e540a21f2736d2dde5c823d6f873ff8f26c5e29d4f13c464684b6ad5b63aa-2026-09-26T03-10-01-929Z-failure
drwxr-xr-x@   7 User  staff      224 Sep 30 10:57 7e143a64a28385aa4d9411399668294903c3d947988c9808843d5609dfae516a-2026-09-26T03-20-10-424Z-failure
```
EXIT: 0
COMANDO: find .engine/raw -type f | wc -l
```text
    1718
```
EXIT: 0
COMANDO: find .engine/raw -type f -exec ls -la {} \; | head -100
```text
-rw-------@ 1 User  staff  39 Sep 26 10:13 .engine/raw/22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure/page.html
-rw-------@ 1 User  staff  938 Sep 26 10:13 .engine/raw/22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:13 .engine/raw/22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:13 .engine/raw/22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:13 .engine/raw/22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:08 .engine/raw/a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure/page.html
-rw-------@ 1 User  staff  953 Sep 26 10:08 .engine/raw/a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:08 .engine/raw/a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:08 .engine/raw/a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:08 .engine/raw/a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure/accessibility.json
-rw-------@ 1 User  staff  66106 Sep 26 10:07 .engine/raw/f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure/page.html
-rw-------@ 1 User  staff  793 Sep 26 10:07 .engine/raw/f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure/context.json
-rw-------@ 1 User  staff  897 Sep 26 10:07 .engine/raw/f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure/network.json
-rw-------@ 1 User  staff  3459033 Sep 26 10:07 .engine/raw/f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure/page.png
-rw-------@ 1 User  staff  688911 Sep 26 10:07 .engine/raw/f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure/accessibility.json
-rw-------@ 1 User  staff  39724 Sep 28 13:53 .engine/raw/c814d7be018de702efc0b5d1fb1c32d2b8ad32bb59820afa57aa02d7299cedd8-1790578386955-network.json
-rw-------@ 1 User  staff  204629 Sep 26 10:09 .engine/raw/dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure/page.html
-rw-------@ 1 User  staff  900 Sep 26 10:09 .engine/raw/dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure/context.json
-rw-------@ 1 User  staff  42721 Sep 26 10:09 .engine/raw/dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure/network.json
-rw-------@ 1 User  staff  260125 Sep 26 10:09 .engine/raw/dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure/page.png
-rw-------@ 1 User  staff  815106 Sep 26 10:09 .engine/raw/dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure/accessibility.json
-rw-r--r--@ 1 User  staff  6550340 Sep 26 11:36 .engine/raw/pinnacle-feed-diagnostic-1790397337932/feeds.json
-rw-------@ 1 User  staff  39 Sep 26 10:15 .engine/raw/3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure/page.html
-rw-------@ 1 User  staff  940 Sep 26 10:15 .engine/raw/3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:15 .engine/raw/3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:15 .engine/raw/3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:15 .engine/raw/3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure/accessibility.json
-rw-------@ 1 User  staff  132814 Sep 26 10:23 .engine/raw/e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure/page.html
-rw-------@ 1 User  staff  747 Sep 26 10:23 .engine/raw/e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure/context.json
-rw-------@ 1 User  staff  76909 Sep 26 10:23 .engine/raw/e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure/network.json
-rw-------@ 1 User  staff  277797 Sep 26 10:23 .engine/raw/e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure/page.png
-rw-------@ 1 User  staff  649329 Sep 26 10:23 .engine/raw/e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure/accessibility.json
-rw-------@ 1 User  staff  500493 Sep 25 18:39 .engine/raw/c587a50a49218e2a2acb732ad2b729f5e38e33c62a841b6a1e4ba121f380b009-1790336392442-dom.json
-rw-------@ 1 User  staff  543398 Sep 26 17:55 .engine/raw/c587a50a49218e2a2acb732ad2b729f5e38e33c62a841b6a1e4ba121f380b009-1790420123678-dom.json
-rw-------@ 1 User  staff  39 Sep 26 10:10 .engine/raw/7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure/page.html
-rw-------@ 1 User  staff  966 Sep 26 10:10 .engine/raw/7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:10 .engine/raw/7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:10 .engine/raw/7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:10 .engine/raw/7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:16 .engine/raw/d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure/page.html
-rw-------@ 1 User  staff  957 Sep 26 10:16 .engine/raw/d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:16 .engine/raw/d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:16 .engine/raw/d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:16 .engine/raw/d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:18 .engine/raw/b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure/page.html
-rw-------@ 1 User  staff  999 Sep 26 10:18 .engine/raw/b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:18 .engine/raw/b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:18 .engine/raw/b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:18 .engine/raw/b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure/accessibility.json
-rw-------@ 1 User  staff  3797 Sep 26 10:13 .engine/raw/0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure/page.html
-rw-------@ 1 User  staff  846 Sep 26 10:13 .engine/raw/0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:13 .engine/raw/0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure/network.json
-rw-------@ 1 User  staff  46576 Sep 26 10:13 .engine/raw/0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure/page.png
-rw-------@ 1 User  staff  73459 Sep 26 10:13 .engine/raw/0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure/accessibility.json
-rw-------@ 1 User  staff  799104 Sep 26 18:01 .engine/raw/5c28c3e55b1f8993405e37bc280203821250982161ceb1aba2b42044b890c9c3-1790420507766-dom.json
-rw-------@ 1 User  staff  39 Sep 26 10:15 .engine/raw/e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure/page.html
-rw-------@ 1 User  staff  933 Sep 26 10:15 .engine/raw/e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:15 .engine/raw/e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:15 .engine/raw/e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:15 .engine/raw/e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure/accessibility.json
-rw-------@ 1 User  staff  551307 Sep 26 10:04 .engine/raw/c587a50a49218e2a2acb732ad2b729f5e38e33c62a841b6a1e4ba121f380b009-1790391889364-dom.json
-rw-------@ 1 User  staff  306130 Sep 26 10:19 .engine/raw/a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure/page.html
-rw-------@ 1 User  staff  840 Sep 26 10:19 .engine/raw/a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure/context.json
-rw-------@ 1 User  staff  17346 Sep 26 10:19 .engine/raw/a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure/network.json
-rw-------@ 1 User  staff  493241 Sep 26 10:19 .engine/raw/a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure/page.png
-rw-------@ 1 User  staff  1136639 Sep 26 10:19 .engine/raw/a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:10 .engine/raw/60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure/page.html
-rw-------@ 1 User  staff  1192 Sep 26 10:10 .engine/raw/60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:10 .engine/raw/60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:10 .engine/raw/60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:10 .engine/raw/60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure/accessibility.json
-rw-------@ 1 User  staff  187945 Sep 27 17:24 .engine/raw/331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure/page.html
-rw-------@ 1 User  staff  920 Sep 27 17:24 .engine/raw/331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 27 17:24 .engine/raw/331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure/network.json
-rw-------@ 1 User  staff  30466 Sep 27 17:24 .engine/raw/331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure/page.png
-rw-------@ 1 User  staff  29456 Sep 27 17:24 .engine/raw/331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure/accessibility.json
-rw-------@ 1 User  staff  181662 Sep 30 11:25 .engine/raw/8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure/page.html
-rw-------@ 1 User  staff  673 Sep 30 11:25 .engine/raw/8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure/context.json
-rw-------@ 1 User  staff  80814 Sep 30 11:25 .engine/raw/8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure/network.json
-rw-------@ 1 User  staff  539467 Sep 30 11:25 .engine/raw/8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure/page.png
-rw-------@ 1 User  staff  243360 Sep 30 11:25 .engine/raw/8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:19 .engine/raw/10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure/page.html
-rw-------@ 1 User  staff  943 Sep 26 10:19 .engine/raw/10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:19 .engine/raw/10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:19 .engine/raw/10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:19 .engine/raw/10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:06 .engine/raw/549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure/page.html
-rw-------@ 1 User  staff  915 Sep 26 10:06 .engine/raw/549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:06 .engine/raw/549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:06 .engine/raw/549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:06 .engine/raw/549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:09 .engine/raw/d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure/page.html
-rw-------@ 1 User  staff  1018 Sep 26 10:09 .engine/raw/d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:09 .engine/raw/d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:09 .engine/raw/d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure/page.png
-rw-------@ 1 User  staff  2355 Sep 26 10:09 .engine/raw/d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure/accessibility.json
-rw-------@ 1 User  staff  39 Sep 26 10:14 .engine/raw/88e9465401411ccfcef42e746416dce7e7effbad35648bf1d44a3a90e623c201-2026-09-26T03-14-13-776Z-failure/page.html
-rw-------@ 1 User  staff  957 Sep 26 10:14 .engine/raw/88e9465401411ccfcef42e746416dce7e7effbad35648bf1d44a3a90e623c201-2026-09-26T03-14-13-776Z-failure/context.json
-rw-------@ 1 User  staff  2 Sep 26 10:14 .engine/raw/88e9465401411ccfcef42e746416dce7e7effbad35648bf1d44a3a90e623c201-2026-09-26T03-14-13-776Z-failure/network.json
-rw-------@ 1 User  staff  4254 Sep 26 10:14 .engine/raw/88e9465401411ccfcef42e746416dce7e7effbad35648bf1d44a3a90e623c201-2026-09-26T03-14-13-776Z-failure/page.png
```
EXIT: 0
COMANDO: find .engine/raw -maxdepth 2 -type d
```text
.engine/raw
.engine/raw/22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure
.engine/raw/a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure
.engine/raw/f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure
.engine/raw/dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure
.engine/raw/pinnacle-feed-diagnostic-1790397337932
.engine/raw/3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure
.engine/raw/e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure
.engine/raw/7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure
.engine/raw/d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure
.engine/raw/b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure
.engine/raw/0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure
.engine/raw/e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure
.engine/raw/a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure
.engine/raw/60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure
.engine/raw/331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure
.engine/raw/8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure
.engine/raw/10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure
.engine/raw/549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure
.engine/raw/d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure
.engine/raw/88e9465401411ccfcef42e746416dce7e7effbad35648bf1d44a3a90e623c201-2026-09-26T03-14-13-776Z-failure
.engine/raw/b49458e2ab75c944680636a4490a36834c089b585bf0c5629d6b14f1e760fef0-2026-09-26T03-12-48-772Z-failure
.engine/raw/b5ece4c11ec5e68ff83a907c84a9740d2c96b840566b7cb1f91d9f2a76866725-2026-09-27T10-25-17-085Z-failure
.engine/raw/742008bb949bae75f29cc4621f0113095645e78ed8e4a0cc88ae2757b4979d0d-2026-09-26T03-13-35-374Z-failure
.engine/raw/ac1198f3a74085454b75a07c9b04768fa1719ba423477e0fec6d4b6a474b5b48-2026-09-26T03-08-34-475Z-failure
.engine/raw/e31e8e9e55cb58f72db2db292976372682bf261524b8a39ddc1c20aa387b5234-2026-09-26T03-22-31-502Z-failure
.engine/raw/2a8cf6c4307d16f5ae924aed415cd50a2cf64926d9d3f0f627ed704cbec49285-2026-09-26T03-10-14-589Z-failure
.engine/raw/1644c64e813418a3f49b9411a9168fa724252b4e9aa10d2befe24e2da5ae6e2e-2026-09-26T03-05-44-918Z-failure
.engine/raw/70d4c83c2b9b36c20a3a7b1f07587b71e5cbf8d48e312bc3750432988126160f-2026-09-26T03-04-35-691Z-failure
.engine/raw/42089f96c378c750ad024e40fabf316e3c2bdb0ff489ab88e4d6234ea8703703-2026-09-26T03-05-37-419Z-failure
.engine/raw/bc8f3e996fbd67ca0cc0148f02ca4cc3383ce5b5ddcf4a8db715f4215d1629c2-2026-09-26T03-10-30-277Z-failure
.engine/raw/1605989ceece43e4ae539b0e53d552467a5106ce1551baa6376a08efe220656d-2026-09-26T03-14-17-405Z-failure
.engine/raw/9962006fc489b91dce63a7ac06b41467d3e418cad5154fe71009e5aae45df46a-2026-09-26T03-04-30-691Z-failure
.engine/raw/76db8066a4b3da4293e0dcbcea95e18038d76c401d2b1181164180bd666da6e5-2026-09-26T03-04-59-924Z-failure
.engine/raw/6b2c80026e8568d9c7c355bc82b0c21add8b60e54a3c34f661d49f962d13f853-2026-09-26T03-08-26-951Z-failure
.engine/raw/53581623e18731487b2058d25ff0f73de5806ee3b49d01df87a060d35493addc-2026-09-26T03-15-23-531Z-failure
.engine/raw/e4f502ec8ae7f5dcbf61666f2da279540b13b7da1957b87c1f82b5710d779ff2-2026-09-26T03-21-58-044Z-failure
.engine/raw/62a37f4444dacdd0ff1a1e2f804ff08ac72170fc24197c89b07adfed6a96a16f-2026-09-26T03-03-20-971Z-failure
.engine/raw/ec1c3371a91bf58608773169979a8866ecf503acb1260b9a2920910b59fe2abd-2026-09-26T03-03-09-206Z-failure
.engine/raw/a510ad398a412a6979959d07da6bd4de413d1aa9140aea1a10755f2c4f5789bd-2026-09-26T03-04-39-321Z-failure
.engine/raw/betsson-retry-browser-1790415949115
.engine/raw/bcd02d8a7602356551dc599c49152030debc55aee37113a15d2968f886d76cb5-2026-09-26T03-09-26-374Z-failure
.engine/raw/bed9900eb3383ce6fb61b25a84b95ad6f009b6e96f8aabb7c51269f34dcb5951-2026-09-27T10-27-12-922Z-failure
.engine/raw/5f7df4958b5861988c66dfbe7dcebf639a3b5af41a904f2a7f9d658e14b21723-2026-09-26T03-12-07-027Z-failure
.engine/raw/a5f0f3b706981355b075d6bcc05746f05ddd9255dd797610bb58f0d46669e86d-2026-09-26T03-16-25-973Z-failure
.engine/raw/14c6474b905a055abba7ce6bbbfeaf2e953f77331d3a1dd2c42604be753d3e4a-2026-09-26T03-18-40-215Z-failure
.engine/raw/e26530a745125ade0ce0bc3ddd8744ef9bdefc282e4276f7f353e1fb5404ffc2-2026-09-26T03-12-44-976Z-failure
.engine/raw/097b094ce33b3de5c4079329c6cdd75c2b093e5e96bf37e935684a46a5a20470-2026-09-26T03-05-48-597Z-failure
.engine/raw/2a806f1be88627685585babc2d14b497c938cec6fe65d82f9feaae482163f97d-2026-09-26T03-05-22-498Z-failure
.engine/raw/b13c09fa8925043c1f1097f2ec1f118dbda319b3a8a89c021795370c3341fe55-2026-09-26T03-36-39-126Z-failure
.engine/raw/61c0999c4774f7274238895df5e349c6f2d107d73b24409fd450cc9a518c7033-2026-09-26T03-18-48-028Z-failure
.engine/raw/f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-27T11-09-03-979Z-failure
.engine/raw/063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-2026-09-26T10-38-08-549Z-failure
.engine/raw/9140e2830704761f5e7fc896d8103755b9af6edb78efd821f6c4b3521e844c45-2026-09-26T03-24-05-927Z-failure
.engine/raw/5af6937ed86182455a116b0807d9838f9ae2b17aafe9a2177c6b4375409c6828-2026-09-26T03-18-51-865Z-failure
.engine/raw/df696e07815b4e25f73173cc0f4519462ab607619bd198382c0c5920fa1aba81-2026-09-26T03-02-47-165Z-failure
.engine/raw/6067fbb25ec02c7fa3400cd665ab217cb6bf89463a5971a1a3765e714fb60607-2026-09-26T03-16-14-931Z-failure
.engine/raw/b59cb4655fee3a035f5c0de812552c818674cfc1857053afbbbc89cf4920964b-2026-09-26T03-20-17-791Z-failure
.engine/raw/af9ab968934cdf63c1cf5f1b3c8901aae66402aa5f6e927878b8b48884ac0181-2026-09-26T03-16-29-685Z-failure
.engine/raw/80209214377f6fed94a0af8578cfeec422c75a1c120a1f1815576bfa06e6c58c-2026-09-26T03-10-59-035Z-failure
.engine/raw/7ee1eb080629fa4fab8d83b86e29c677942ee8c27f11f342edb9854080a118e2-2026-09-26T03-16-22-288Z-failure
.engine/raw/9c591d7178b009bf23157b50373f27a687ef5599ef350c1f67c42250fd533ff0-2026-09-26T03-13-48-734Z-failure
.engine/raw/c2b95527448fbd6c8a8be2856879d737d4b8e1498d87b1eb5cadcf7809c3e7cc-2026-09-26T03-02-35-420Z-failure
.engine/raw/17c85b0772ebe6a923ec406955998a3b2c3a22556b878037ad7a7f27f7a1c1a0-2026-09-26T03-22-02-342Z-failure
.engine/raw/6bfc9e11cd457497c85a04e79a2dae4c2495a4f48dfc979907a1167831dcee42-2026-09-26T03-07-30-553Z-failure
.engine/raw/33a437f750112e158ec241c1269fbc7e36307b59d552333c0c2c6a8d76f47b80-2026-09-26T03-15-02-257Z-failure
.engine/raw/44163116a00a384e80dd2279ca11b1db5f2a969a7ae12bd84c11ca98544cbb27-2026-09-26T03-05-11-400Z-failure
.engine/raw/2cb665492cdc3c9680ca8a7b01d57b6c4d57c9db05ffa8890cb6dc07604d8195-2026-09-26T03-11-02-841Z-failure
.engine/raw/994fbd629c79076afa2d234049c271058c26c45b4fd55420303e380b5f6a66e1-2026-09-28T06-34-45-437Z-failure
.engine/raw/2f2f6b98f792016328319bd011296bc38389f444a7bd37c317984490b7974d1d-2026-09-26T03-23-30-413Z-failure
.engine/raw/f9771afc3bf1a4f80b093b0676a387d173445efc38e07d004ee842588937318e-2026-09-27T10-25-02-153Z-failure
.engine/raw/83f6b944d25e033eb8d72523e2a74a373be91ad5fd01f14e3c0f9f58bdc88b80-2026-09-26T03-08-45-839Z-failure
.engine/raw/9b6f88c32143d3b05e96c0fa8d8b1c6b0e45abdc56e7ea54e26ebea6120c1880-2026-09-26T03-04-52-998Z-failure
.engine/raw/6dd8c889d6cffd4de9b94c443f14ec3e23868de273d070d48227cd1ca40feb66-2026-09-26T03-15-49-648Z-failure
.engine/raw/fafb5fde3899308d4e942292994ec8e3d4fde474e6501661634b09a3bdbbf93f-2026-09-28T04-36-15-118Z-failure
.engine/raw/62fd71b0c270763e2a688891ae5f8a11d7245c4d76f84654fb7bce6120868dbf-2026-09-26T03-13-12-976Z-failure
.engine/raw/9147ff35bf587c638adff7320c58abfa665b6cef38c62b88162bc95c6a663c6e-2026-09-26T03-04-43-096Z-failure
.engine/raw/2265bc80a709cbfe48e93f50f8d306287dc5508c5b07dfa23a9c7938e4a975cc-2026-09-26T03-21-10-627Z-failure
.engine/raw/816555697c5c1544ea00bb92d2340cf0ca90b13146f2893808e221fd741ef6a2-2026-09-26T03-08-15-491Z-failure
.engine/raw/5b2505f3a8ba81e40875629c4f1a7896663cc0f34a0e9aa6cff1deb67913479f-2026-09-26T03-13-05-672Z-failure
.engine/raw/f055a05abded6540df3557ae7d58c4ae1a55aa41eee4c165577295915e79f1ba-2026-09-26T03-08-11-063Z-failure
.engine/raw/97033c508b1812d8c11f3d1b113f84cf0783c7c87720ec1f891187390d922128-2026-09-26T03-14-10-092Z-failure
.engine/raw/e1ddda1182dfda89c091d8b2fd193722fa1352311bb695aff0286f4bbd8b612c-2026-09-27T10-25-11-516Z-failure
.engine/raw/480f794de2a1b826a76c68cfc75304dccb145d64be4b79ca1f097292ceb84d7c-2026-09-26T09-45-28-355Z-failure
.engine/raw/f7bc29ee91d7ab07bf18f71b982e60bd7a4746633068fa275e3db332b8a3881f-2026-09-27T10-09-58-874Z-failure
.engine/raw/8f56db392790f5a5d1b69f4753c486d0ebefb4ab0e5fe28883265e61adccffde-2026-09-26T03-12-40-897Z-failure
.engine/raw/a00258337040aaa942c6610764b437a767a9ca817f6a42fa9dc99e14d287e424-2026-09-26T03-19-47-023Z-failure
.engine/raw/2e38fc44534ed375a966695e2d6097dad07c5a7b0aacd8a029e42d5189b04310-2026-09-26T03-12-52-574Z-failure
.engine/raw/108336ca4b4400e260268c095fc38089a42e040498f80d880f9f660c1940f661-2026-09-27T10-25-26-643Z-failure
.engine/raw/7eedec1d0675c665f25277f6be809683390ff897ba7d8d6c16c590fb5a0122b9-2026-09-26T03-03-28-514Z-failure
.engine/raw/18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-2026-09-26T04-34-35-503Z-failure
.engine/raw/cc4c41e7494108dc9261ef650fb530650b8bddc6225287c992a46ca15b6a18b5-2026-09-26T03-14-21-112Z-failure
.engine/raw/betsson-home-diagnostic-1790415699508
.engine/raw/fb4b4944f4dbbcf41082681a72377a41143ee194552f903444e2fabbf054efbf-2026-09-26T03-16-18-601Z-failure
.engine/raw/b7c6e223ff6a77e7eb4a42ccca70936fdd1c7941da4563da14fb6033b0225f11-2026-09-26T03-18-06-425Z-failure
.engine/raw/4bd32e6f92bfe6876c8106e36c65f81a9fdfcd73e2e4c674d1d6e42a23da7555-2026-09-26T03-03-55-657Z-failure
.engine/raw/2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-2026-09-30T03-53-54-979Z-failure
.engine/raw/85bcd457e554f5bb558fb8aa9f8901eea8464070a2f7b6a86a75f1573b53e766-2026-09-26T03-20-34-518Z-failure
.engine/raw/0b99783c8e848a5079ce84282e4f7a5aa7e9d6a934fdaa9c5fd6c96b557179c9-2026-09-26T03-05-26-206Z-failure
.engine/raw/d55e34c4cc152828b357a520a7b0052a51edcd2aa1362f7fc02a8a7a991b5b52-2026-09-26T03-12-33-572Z-failure
.engine/raw/2923d757681e7e4733bc8d9581d001c08c16afb4c224347ef581bfa56f6572bc-2026-09-26T03-22-53-171Z-failure
.engine/raw/f884ff9429c594a57533d5c497b6421ca8975e6ce36c66071d1f8bebbe4a5dad-2026-09-26T03-20-49-392Z-failure
.engine/raw/f6453849748ecdd7d7f23fe56c4c012b4289624ee5b351d8d21ee26452812a58-2026-09-26T03-16-40-934Z-failure
.engine/raw/3400732a893f7b5e7f844fe62686664c1711eb3bb1382d1e4cf980fdb0b38b21-2026-09-26T03-20-14-213Z-failure
.engine/raw/ca4c6b9954c12fb6bdaa8c99a54fdc5b970a4a11780fc315a996c407f6da667d-2026-09-26T03-18-18-070Z-failure
.engine/raw/f5ac50e499f65a670abcd3c74007c550d49f385fb5316e0d7bed8459a26a4790-2026-09-26T03-15-57-281Z-failure
.engine/raw/4d06b69f5db29022a6b95e1dcb7738dbb80b46ca6f00d3a04d374fe9e44c2b3d-2026-09-26T03-13-52-347Z-failure
.engine/raw/bd7ceed9be71b211720983de2dcbbcd983ec257914be2f0ea8539b048b62f971-2026-09-26T03-15-38-440Z-failure
.engine/raw/6bb7cb040f6d1ff811e68ad754bc92e0447018593c6061d1a3f7fd5a4db6d20e-2026-09-30T04-26-16-562Z-failure
.engine/raw/9cc19a9ea1bc4780120f4af5e4b345677f7748f276e1ae38b34a9227cf89a2b2-2026-09-26T03-15-34-780Z-failure
.engine/raw/a103abea5cd1667e4d3d99ef9f2b2455e41c9a955027419b839a5e9704ce73de-2026-09-26T03-10-05-684Z-failure
.engine/raw/b5fea386f1b2f2f3af3534bd2bd86fac5e3fa9de0daba8c37bf20f1ca0baa4b1-2026-09-26T03-12-10-786Z-failure
.engine/raw/8739eb5b79692b6f57ad1e6a9a87ac176984a6f988ce938080facf6a3f402253-2026-09-26T03-19-43-366Z-failure
.engine/raw/6445f892d6d3db2a5c0bdc41fb9c420dde9e1be023ae7564c09059c8b2eda63b-2026-09-26T03-08-23-056Z-failure
.engine/raw/e124573519c6c9fb07aa7b3305413d8a5504cd8c0a3666c24ec423c6c1bff38a-2026-09-26T03-05-33-721Z-failure
.engine/raw/0a3c068ecc815ffe86cf6c99298dee5422ad6f79bc875438793deab473b69332-2026-09-26T03-52-58-242Z-failure
.engine/raw/2854a1746395bb3d11b1599bd36605673d2eaa8a63aeb4bf53e1ea6b0f4635e4-2026-09-26T03-21-33-176Z-failure
.engine/raw/1595da0b0da87f15beef45999335354cd457c9e4942f666d9b9f318dfd1ce8de-2026-09-26T03-20-30-953Z-failure
.engine/raw/0258b3efea9558e76cac0b8314753ad695f24d3b807d8fac52131f67e94548d8-2026-09-26T03-11-10-117Z-failure
.engine/raw/5ddae3ea8cdb6ee980fdcaefbcbc4c969580fec849e867b402213a9d10a55032-2026-09-26T03-14-36-962Z-failure
.engine/raw/f4ed83f2da3016da141bf0ba7c35b1eedec833a09786562564c9d4f4279a0634-2026-09-26T03-20-06-748Z-failure
.engine/raw/winpot-sport-browser-diagnostic-1790504179379
.engine/raw/6dd24eec3bf8f479f7cc85b4792d23013d17662af6a2c5669a388d6a6954babb-2026-09-26T03-20-53-143Z-failure
.engine/raw/543cbfa76616ae3813e3ab5f6d67363908d3a6106bccc6adabe12c8ca3191ae1-2026-09-26T03-14-06-414Z-failure
.engine/raw/3eda3e4475e060a192f65fe822c34d34b70126ec929636ebbda984cd67c824c7-2026-09-26T03-20-45-764Z-failure
.engine/raw/749dee89cbf729736ac119a4e395142b0800f29ab6d4ab7ef5b858ed670bd2d9-2026-09-26T03-17-51-632Z-failure
.engine/raw/c209b9be2669d6fdff602260c035e08b2afa80d4788ee628762cb87da5bdf7a0-2026-09-26T03-03-16-604Z-failure
.engine/raw/0d4fa83013bcce81674f63e85dc5f83c105cd1be2f7a0a221222a9999c7b68b2-2026-09-26T03-22-39-098Z-failure
.engine/raw/dab2f3f4a80cc4b9a0ad7d24915e4fa80ab9718e9b09dbe039a56a9a95839660-2026-09-26T03-14-24-812Z-failure
.engine/raw/1f194ac306a5776b0a8df6b979f7616df0bbcd2dba7756af08550d8e9e7215e3-2026-09-26T03-14-47-575Z-failure
.engine/raw/ca651bb05c322a42eee99f09b98463a161c17350e7cf06a1cf56cd49e181f843-2026-09-26T03-11-59-540Z-failure
.engine/raw/9bf0691c2194341d046a1a63bd9a9350002ea015cc8e84db1a4bce871fa4f66c-2026-09-27T10-27-02-139Z-failure
.engine/raw/a1643c20992465c63b5927bbb3f25ef4c4d3daf414bb2301903dea16c8479ab1-2026-09-26T03-18-21-789Z-failure
.engine/raw/ece2cce2047542ea514ed35e6416069d528e4e4a009264c3c92b8c9da5a99320-2026-09-26T03-12-14-556Z-failure
.engine/raw/b47c90c6cae8f474817e704586844e8f8cb4b1daa202d36b17978afed95ad78b-2026-09-26T03-07-22-928Z-failure
.engine/raw/98441d73fe496b1b14485ee648ad9a050a7994d10d9dde19bf59f413a3f9a312-2026-09-26T03-03-01-939Z-failure
.engine/raw/c67ce860bf3738fc9243a4eda40cf548790e971c5f45b4c77701c8b493b075bd-2026-09-26T03-03-24-804Z-failure
.engine/raw/2f759b3bc377b98cd1d9a8ba988dc1e379a9c1e173331e31a01e21a77fa35b62-2026-09-26T03-22-17-092Z-failure
.engine/raw/5f4fa417b3e8f7bce601bad74a2d8d9abde025e1ce0eec2a5556f736ea54aa5a-2026-09-26T03-21-48-208Z-failure
.engine/raw/883edf243518bcd944d976c5cfc56879b8caea61d7bc82d5bd8b9e44321b6a1e-2026-09-26T03-09-44-948Z-failure
.engine/raw/3610406a8a35ff59423d520116fbb030fa97b45e82f8641e8776fec8427a7cbb-2026-09-26T03-20-27-302Z-failure
.engine/raw/d8580484b6b114ec379be561ccea3cd9e55f2bc8aa5e7918eb66facbe677ce16-2026-09-26T03-11-25-246Z-failure
.engine/raw/76db39f404c58a9c0e0584f1c5496f31d1d2e99848eee5bdd24d0294b603a3f2-2026-09-26T03-13-28-049Z-failure
.engine/raw/0b5e14b0e89f4d1a1fe98035dfd6aa9d863c9ce6bade91ea91c741c7c402bae8-2026-09-27T10-24-51-165Z-failure
.engine/raw/05f09dac180b0455437160606f11c3ca475ad33c67a93c4ee22fb9d1d9b1ffad-2026-09-26T03-08-53-607Z-failure
.engine/raw/bd0e54f498bdc239060168553dbd137d6490c1f9e880159f5bf6ddb36069e3a3-2026-09-27T10-07-30-426Z-failure
.engine/raw/76523c71585ce089991d06b195685fda29e1e40fa1142373f9bae4f6b3e0484b-2026-09-26T03-17-59-018Z-failure
.engine/raw/4660dff78e9f6757e615cc31df75934c60e011039156b95981da3c99fcfe0fb6-2026-09-26T03-21-06-980Z-failure
.engine/raw/60d5cbd06addd55be955f7c9958e1b75e990ef5529498f716a83d9dc98b2ad55-2026-09-26T03-14-51-290Z-failure
.engine/raw/5df714049ddd181559482594d64ce55f00d6172e262fdc774aa6b3ef93f89b56-2026-09-26T03-03-05-568Z-failure
.engine/raw/be0ea1c2de16afda58900690b41f477c2531ffed19b6eaab2c1d8d4901850e98-2026-09-26T03-13-17-824Z-failure
.engine/raw/2ac53fec9262defde87d2bced7db878ed251b2637dddbc0f54b0cca9b43fc2ac-2026-09-27T10-16-07-371Z-failure
.engine/raw/2ac572d6e50f83cfdaefa5ad18788779270a0f2cb0fcf457fab901289f2a2a18-2026-09-26T03-16-37-207Z-failure
.engine/raw/6acd554c29231439caa52f1742395d54005d34c815adb75318034b895fb3fc07-2026-09-26T03-04-03-051Z-failure
.engine/raw/e5b4424364a6a35327304d61b1fefb755fe8166f42fc68e82278021dd16778b1-2026-09-26T03-02-28-147Z-failure
.engine/raw/7e3d4c3d85af9884bdf5cf10e2691059358ee50126cf7d5718c7e60db105d62b-2026-09-26T03-06-14-274Z-failure
.engine/raw/37ecf0a1e92de20faf05dd824a12d2dd92d77e871d9b603b12353e26b994bf11-2026-09-26T03-09-37-707Z-failure
.engine/raw/b9a56699216a0c1ec12c937498f85a663c397b0eb657cd4b1f90d9abfa2358f4-2026-09-26T03-04-18-660Z-failure
.engine/raw/59bea850b78b40d146245fa45bf738e798fd54f668ed986295530ea55d2207b5-2026-09-26T03-15-16-165Z-failure
.engine/raw/9ac5294152e6c56e8eb1813710b92e6d4af9dcdadd83550f1303e9df7a1e8bba-2026-09-26T03-08-30-764Z-failure
.engine/raw/13d532e81457201097aed9416ef63cd0f62d70174b750a32a2f033304d7ffaa3-2026-09-26T03-21-36-999Z-failure
.engine/raw/1c57c20fff4c167733466c8f2b54b7b4a23f20a37bdbe0850711c0e45e523169-2026-09-26T03-20-03-048Z-failure
.engine/raw/35b42888090eae7b2699cf9da6a886c02927fafe08f10bab73b61f849010b75a-2026-09-26T03-22-06-179Z-failure
.engine/raw/29202e9b0a185b7c1ea24828f483f2e5965950999cb466759d4f056a22a9aaee-2026-09-26T03-11-55-828Z-failure
.engine/raw/5e4a06bb863e40af83448ba48e3f646cd8765f24906eaebe3b666d62de997c66-2026-09-26T03-19-54-473Z-failure
.engine/raw/d767a2dd678d90ec45250b57f1bd376d4d916b0ca419d126d652e1409cae449a-2026-09-26T03-17-55-366Z-failure
.engine/raw/c40a5e59c822a5bc6d96b9cf6d867b02f57ac3a625316a117d3c2cb72fa0364d-2026-09-26T03-10-18-301Z-failure
.engine/raw/61615c3a40d69983ff69793af2715edb5964dcd888a34bdb90905c3b8fdb4a61-2026-09-27T10-10-15-100Z-failure
.engine/raw/4936891ea5129a3962640cebc9122701c0431b0e25cdfde8ab73d4b60c86f332-2026-09-26T03-16-07-480Z-failure
.engine/raw/9c886012537c4974124d196487370af9c86b2776b962c6289d7d233a86753df5-2026-09-26T03-18-02-669Z-failure
.engine/raw/0758cb9311f3e5447d2ca2080eabe8c84319cc0afad7fbfecd6b5dea6744758c-2026-09-26T03-12-56-259Z-failure
.engine/raw/cacd4f78c27c5e39d9178a3ca9b42562a1e53589da2e265f3cbfea9ed90a5ad4-2026-09-26T03-11-36-596Z-failure
.engine/raw/69365748ab68ddb6b20c091fb61e0eed89ef895cc81600427c36f4c8b69a3311-2026-09-26T03-12-37-208Z-failure
.engine/raw/b1cfc340cc8059ad5d32adccbcc1199446c0d587fc07de81fe36c7bc66cc9831-2026-09-28T06-34-28-871Z-failure
.engine/raw/f230084055426f700c7aceb8a835b504ffc9ca9c8826e396c3ad4c58fdd727e9-2026-09-26T03-22-24-545Z-failure
.engine/raw/063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-2026-09-26T09-46-26-898Z-failure
.engine/raw/c1842e29a53b5fb979e787e912e7ec8855824f675346f4b32653dc7aa4296a96-2026-09-26T03-21-18-185Z-failure
.engine/raw/1d64526cc5619f0e7443280528b1754608ef2ef9d2ec22b2c5c3f8ef9adddf8c-2026-09-26T03-04-22-360Z-failure
.engine/raw/608a9c057f81d37ceda5cadc3819b018b230fe7160c428694776c8eb425eb0a5-2026-09-26T03-12-18-241Z-failure
.engine/raw/e2f06100ff214989d39edc920b59a9095b9347f1dd27a9b8c134ec7a24c0607c-2026-09-26T03-18-14-072Z-failure
.engine/raw/f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-09-29-186Z-failure
.engine/raw/9ed7ef8b5eceac677bb4406bfcc44f07ac7b3f3f079785e15bdad544748dae10-2026-09-26T03-09-22-711Z-failure
.engine/raw/c6dc8357b5103b0151d8c99357e6bdf778bf3f6d5f02dc89554586dfc0a6d571-2026-09-26T03-05-18-846Z-failure
.engine/raw/fab67466f7eec0dd5e99b4ff6828eb13ba9a2de3fbd005250568d9a54b51f485-2026-09-26T03-03-35-980Z-failure
.engine/raw/37f2ba42414503255cb0bc0f21f0ec993acf75ec887a4c5d2590791342a6deaa-2026-09-26T03-05-07-725Z-failure
.engine/raw/15cfdc4fac99e11a31a41c5dc643b34e11cc2509bca99c6ab1d98a80fc76d874-2026-09-27T10-24-58-125Z-failure
.engine/raw/dffa1527ed28a2f6f1cec5dcac265083eb28c5091fe7a948c784dc2faf396aa9-2026-09-26T03-15-45-858Z-failure
.engine/raw/bb15f8ff66ed59345d7612f0e5deb21fdffb436c0363237c1134978394df1429-2026-09-30T04-28-58-377Z-failure
.engine/raw/5d6b6dda2b952c66a08215f461fb976df498eb7e31a33171ff29f7140774fc9b-2026-09-26T03-23-12-383Z-failure
.engine/raw/9e5a67bd2fe364041b831634070f438473f4f8dd085cc8a15aaa650bc3c496fb-2026-09-26T03-10-47-944Z-failure
.engine/raw/a10991a8f59fad1f8ea7a804c34826d34ff9ff2e1dc8a39ce65e12c68274b22f-2026-09-26T03-18-44-181Z-failure
.engine/raw/ae2063e1f3ee7ee1612b1fe78551048c85ab00769519dfe6cdf861e5c5c86a67-2026-09-26T03-19-16-987Z-failure
.engine/raw/betsson-mx-sports-diagnostic-1790415996762
.engine/raw/d4ca20db792ce9294bb28a4b0c1f2ae930c24b345a88b968bc67735d3f83191c-2026-09-26T03-23-04-793Z-failure
.engine/raw/5c135cc605ffe49b53b5ddfa0df6a4432f1ef46e31ee3e08c37ba173dd900f0b-2026-09-26T03-12-22-093Z-failure
.engine/raw/85c853daf52a48bfea6a3ad743e6048be7eebf0c67f41aba07d27d113b96718e-2026-09-26T03-18-36-504Z-failure
.engine/raw/04921f35417d9ca5ec50a48e00d172817b4c7fa3859437962a8620b5c756c201-2026-09-26T03-18-25-417Z-failure
.engine/raw/2fb0e7df38caac9bd8cd472fde4d99d5f1ae8d09153844ea8c4ad09762391f9d-2026-09-26T03-02-58-249Z-failure
.engine/raw/2b44d2229a2d63b76b7fa39392b2b38071f84ff2b40d3e702cea90c6a6cafc94-2026-09-30T04-26-52-854Z-failure
.engine/raw/6a82a3f49144d3ae67bf19b76588d0d780bd775dccb16129155af298c232e2cd-2026-09-26T03-23-22-991Z-failure
.engine/raw/4dc211639893393f5e15c678813c159b53089950cf78edd1c35d9f40ca4453e6-2026-09-26T03-05-41-086Z-failure
.engine/raw/a6978eb40d3f70152ca7521c79e48dd85056a7c1e11c3e3945bc25a61e56fb0a-2026-09-26T03-03-52-055Z-failure
.engine/raw/2ff544421ca41e8006758d0f90dd5645e7f3795cdbdadf8e053f8d4b265fe650-2026-09-27T10-27-06-554Z-failure
.engine/raw/fa60d2e88c0d563ad0901549a8af6e1f9e71abaee10d6bef26988223ea2b716e-2026-09-26T10-02-00-443Z-failure
.engine/raw/9c454381bd2e5130512a9ea31a3e9f967929f1b345ad9007a26feb2ca1b5717e-2026-09-26T03-12-03-301Z-failure
.engine/raw/b1cfc340cc8059ad5d32adccbcc1199446c0d587fc07de81fe36c7bc66cc9831-2026-09-28T04-29-49-174Z-failure
.engine/raw/1c1a74a77319ce9af82026a883ff561cfa81237188f0d66bdf65792519a3764f-2026-09-26T03-10-41-494Z-failure
.engine/raw/eec0edea421762864f14d19cd9e6c06753179ea32521440a830810b3eabcc7db-2026-09-26T03-20-38-219Z-failure
.engine/raw/df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-2026-09-30T03-36-09-045Z-failure
.engine/raw/fightodds-diagnostic-1790394312286
.engine/raw/056355036c00b9a1b889270dd626f6dac4f1d38542897ee985ec129158a790d4-2026-09-26T03-13-21-557Z-failure
.engine/raw/240291af7af8734e762f5bedfa1d323f166335090db1c74ee959673bfd1ccf77-2026-09-26T03-22-46-765Z-failure
.engine/raw/44a264d5a28fadaa153d915e67695840dfe7270ec5bcdd0f14c893baff864294-2026-09-26T03-19-39-379Z-failure
.engine/raw/81ef18645660ff6e5b57165bafe58211320cb229a4bbd8819b4a6b2b5cf9e2cc-2026-09-26T03-10-51-629Z-failure
.engine/raw/65ab18dae7751723e6bcc853895b74a432bf86704190617fd01516582cd975ed-2026-09-26T03-23-44-926Z-failure
.engine/raw/792e540a21f2736d2dde5c823d6f873ff8f26c5e29d4f13c464684b6ad5b63aa-2026-09-26T03-10-01-929Z-failure
.engine/raw/3deb2d2176ab4084e85ea0c8d86df97b22a41b11edce90c17b84b7584ec58a55-2026-09-26T03-11-28-917Z-failure
.engine/raw/326d7d86db23f31ad3432d7593de00fef8bb62d558815d1f802802e0d3f0fccd-2026-09-26T03-07-26-844Z-failure
.engine/raw/555374132fc5defdecde365c71610b64e74ce1b01f0a7baf6a0a03102fc2fd48-2026-09-26T03-11-13-890Z-failure
.engine/raw/0d4a49123535d7e62ed4debef57ee9db2ac89701578e922dbce49b891e81a9b4-2026-09-28T06-34-48-500Z-failure
.engine/raw/5e466f4fd0f6c7d4d7d3abb8777bbed335d8bb1b7b7503602e436bd20f7688f4-2026-09-26T03-05-52-260Z-failure
.engine/raw/3bd1703cb4994589881c49e268d8a42e6e0a22f0bcb06ef42354a767506c75aa-2026-09-26T03-16-33-496Z-failure
.engine/raw/0641baf8b6134ce00ccc73d20dbba801612dd9f59f36e14f5111631e74cdd3a8-2026-09-27T11-06-09-691Z-failure
.engine/raw/afaeddde3f82f158e1b944ea2c776852da792e49079c93fff0da4d918446c66c-2026-09-26T03-09-30-224Z-failure
.engine/raw/8aeacaed72374c7e88c990fb7196898cbd73bdefc85a09f42c0e5f83c8f125cf-2026-09-26T03-23-01-005Z-failure
.engine/raw/68d14ee70dc0d7ae637de04a9b7679cd318f9ec90be0802676d25f90c2cd77c2-2026-09-26T03-15-31-047Z-failure
.engine/raw/2106c7f51c0f6f31db88a33488c00fc3a1809fe81f859cad7bcc9a2fce7f8a8b-2026-09-26T03-09-14-917Z-failure
.engine/raw/c9acc7dd511637519b24cbcac5dbb51b68857dae9041a43fe396b709a18a1a85-2026-09-26T03-14-58-562Z-failure
.engine/raw/9b8ea49a8b5a503990e799260b45a52f617da6dd9c0058de74adfec39fd5eb47-2026-09-26T03-04-07-334Z-failure
.engine/raw/cf9d5872fb4720c6cb1247aed113f7ae156249d9a6be0a453f3c21cbd7f6befa-2026-09-26T03-20-23-456Z-failure
.engine/raw/81bc8ab416bd3456490962bab6c7be61237dd348bb0f4328ed2d62046cd57dcd-2026-09-26T03-07-19-022Z-failure
.engine/raw/62a98c9e5852b44e47b01365555777ba62d52c63b827de4e6a3031d511eb164a-2026-09-27T10-27-03-142Z-failure
.engine/raw/06e02e833af0fdcf683e395c07001e91a10a51959784f4d127a00d862b8ad14b-2026-09-26T03-12-29-756Z-failure
.engine/raw/03b7aa187c9f807a4d2a7290272714cc12d40f5fbd01b1ce73f7d7515cd04d33-2026-09-26T03-04-11-159Z-failure
.engine/raw/06d05410678c68a97ce87d4843883925f1f4ab5b41af7203f9e8de485a5dafe6-2026-09-30T04-24-17-423Z-failure
.engine/raw/2936bd032abb95fb9e7d1f49460611de01d380e16ab099d4a743be6da2c4cdc1-2026-09-26T03-10-37-781Z-failure
.engine/raw/ff8d6259f4f0c2b28034c3cf19022ef9ec83c97fbb22b2b60256a56cfe00b413-2026-09-26T03-10-33-998Z-failure
.engine/raw/212e2bfc27024a34ee64f3bfa64f9fc9409679c547ecafaa2fc9a72b0a49fa03-2026-09-26T03-06-18-451Z-failure
.engine/raw/3b1861dc4277f7f15ff568496b9bb2d4bca63803eda94e2899a45759f28635df-2026-09-26T03-16-03-810Z-failure
.engine/raw/98db901900f4aadf5957ac2e771e3b174289ee4a9184d6fd1e495ea29e3825d2-2026-09-26T03-02-39-839Z-failure
.engine/raw/0e45537efa80351b352ee8177e629d09df28ae4fa4187b76a840fd0a993b2b7f-2026-09-26T03-14-28-821Z-failure
.engine/raw/a2ef95a098e8751a3a99156e3fc148f855c7c1449d5c4e94f87d9f05879ed02c-2026-09-26T03-11-44-298Z-failure
.engine/raw/e50a7fdec03aa303781c4f719f704acdf7a88c9e9592e5a0ed070e7c40274adb-2026-09-26T03-07-59-196Z-failure
.engine/raw/683bb0661b67446d62d9097434e4038bf1c4b0b47b60da2dae2e1af0eeb43c07-2026-09-26T03-24-13-838Z-failure
.engine/raw/396ab4a4b9c8a72eb41f8b0e3898cada53fcc924c405804bb05f7a2ba5f56b69-2026-09-26T03-21-00-594Z-failure
.engine/raw/3d8073349700ef8e6b3ffa75e32e3955e94adee3c61e51c72b8a250f383097b0-2026-09-26T03-12-25-928Z-failure
.engine/raw/91867e9ce3da6206362fa27c196d5ba98f78bb7861674cad18f5a928825460ed-2026-09-26T03-08-57-465Z-failure
.engine/raw/e8b2f28fe1bfc8783d743c57962517febcbf8da3c42b9bb810e30ae37ee07af1-2026-09-26T03-09-07-304Z-failure
.engine/raw/492fd358a32f9b13eb106f438b54378cf6efc2c0a3c9d691eff436bf630368ac-2026-09-26T03-02-54-490Z-failure
.engine/raw/c17d208351c4dd4c8fb469a527574fc73e7597304c646d5c4de03569b306ca91-2026-09-26T03-04-14-828Z-failure
.engine/raw/f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-01-45-367Z-failure
.engine/raw/108966c7da2ebd67a297b53268be784de97c423075fe39d807ea49671087657f-2026-09-26T03-21-21-867Z-failure
.engine/raw/285cebde3f04d8c9a7178563c17afca81c3e2147acbcf76273e0687acf02b556-2026-09-26T03-09-48-573Z-failure
.engine/raw/480f794de2a1b826a76c68cfc75304dccb145d64be4b79ca1f097292ceb84d7c-2026-09-26T09-41-18-343Z-failure
.engine/raw/90b0ddc3a8a024c23039ab729144ae208c17d683e90c3215ed0aaf9057a17ab0-2026-09-26T03-11-48-053Z-failure
.engine/raw/395d70fe436f0960a96a8e3dad4cee63a68225615e41db355fe8083041788165-2026-09-26T03-23-58-936Z-failure
.engine/raw/1c26c2fd1f0053d6ccde1233c63ecfc35c093856ed553bc15805aeaaf0727629-2026-09-26T03-23-08-631Z-failure
.engine/raw/2494842d584819edbd7c02b200f2dca86a194499b65f1014321d101048c7d2a3-2026-09-26T03-09-33-912Z-failure
.engine/raw/e5874129ffcd441fa17ba933f1618a1e49be926b16e942f413fef53e014d450b-2026-09-26T03-21-14-341Z-failure
.engine/raw/f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-10-37-239Z-failure
.engine/raw/62a6b1914e212c5d94ad4bf74fee88d6e0a9e7d833c61a8403d840e5f0b97d65-2026-09-26T03-14-43-858Z-failure
.engine/raw/e3d07e41f642e3dda043f124f9e090f9ab7862538a511945a9987784e50c5b2e-2026-09-26T03-09-41-327Z-failure
.engine/raw/0b06393c57af59ab925db9a7227cab155e0bf403dd28549b8a5a4498c104b10e-2026-09-26T03-02-43-526Z-failure
.engine/raw/82036f73cb7997b9792878b0dea6ff89e8ab9b7d94d6057da29a2e6616f39998-2026-09-26T03-13-00-169Z-failure
.engine/raw/5084a63b8949092b127ac21b5e963974ea70a7f8135a1ed8482f346766c6e0e5-2026-09-30T04-23-55-243Z-failure
.engine/raw/dee5fb11e7f48c544ee304bcdddace445e988fead8ac810d2ec9823d427524cb-2026-09-26T03-21-25-475Z-failure
.engine/raw/979be06d3b272b1eb76637f04b8205cdeaf5cacce5e66994e2ec48f19eca7fb6-2026-09-26T03-02-50-819Z-failure
.engine/raw/1b2726d90804096b2d9a66f1bd2b85754347aa57a9f8552ec5fe6f4355610b34-2026-09-26T03-11-52-041Z-failure
.engine/raw/da753f119105a1ee3ba97d1d6e8b88ee8b1781feaa2e1783c1b01c9ae672f968-2026-09-30T04-22-18-810Z-failure
.engine/raw/deb337091c01bf893f28a523c97b68ce56403f2658f82f40a876485615611322-2026-09-27T10-25-14-461Z-failure
.engine/raw/868f2270493dccc7d9922aab54a02884a89ebbbf45955b26d037cc059cd0f7bc-2026-09-26T03-19-58-614Z-failure
.engine/raw/bf6ae8c4e01f74ccb5705af70aa62a29d5360ae7fcb6692a0e757da11d7162a8-2026-09-26T03-08-19-166Z-failure
.engine/raw/cc6d47ddedaa1d6d226d80eb964a2c9de1898037945ff53e76117828cee68502-2026-09-26T03-13-45-018Z-failure
.engine/raw/df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-2026-09-30T03-17-48-376Z-failure
.engine/raw/4cfa598615dba77f7a2e18d53acae7790f9bbe44f2c55f2bfc63a2a03a3403f9-2026-09-27T10-09-31-387Z-failure
.engine/raw/6541d8ae8194656901c0d5907dd8d52381c1a78ae97ada1797917ec6e377ad58-2026-09-26T03-15-05-986Z-failure
.engine/raw/fdc1f1e5a0050495cf2270361823a9a369ce0f4af4bc9fb59c38b202b84fb424-2026-09-26T03-11-40-257Z-failure
.engine/raw/e8cf7c12e9d01a92c062c6b2786ab21663201e6063e78f659d9d45356aefc16b-2026-09-26T03-06-05-574Z-failure
.engine/raw/8d4b47de2d9b45f0d34a8379cba259b7400a7612587fb77c5886c4db9b0bf9f2-2026-09-26T03-22-43-029Z-failure
.engine/raw/0a4480315cfd68f259c1e5aafb38c13fcdc864c27c6971b1466b66757d593fbb-2026-09-26T03-03-48-388Z-failure
.engine/raw/7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-2026-09-27T10-15-48-693Z-failure
.engine/raw/603bd1076ed5a30a538025b28c9790f51e6e651d435bf51069d201a7544435e2-2026-09-26T03-14-33-318Z-failure
.engine/raw/972b02ea6d1edbadadfbca16e0fbf8c7285ad5be38665772722653a1ada80d03-2026-09-26T03-21-44-424Z-failure
.engine/raw/9b0ad345c86fa4cc9a32cbcba6b7237194a60e4e683c21a6ef45bfa6bed94c49-2026-09-26T03-10-22-043Z-failure
.engine/raw/18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-2026-09-27T04-38-34-043Z-failure
.engine/raw/6372e0adfe1b9d7d0c6370abed0b9a8732d621a70ae9841a1b0d1cf178bb2561-2026-09-26T03-23-15-997Z-failure
.engine/raw/f3a812d86bdc693d7f6fbcd788c52d47ab6f332e00e2ac4132f866d92a0f60be-2026-09-26T03-15-42-083Z-failure
.engine/raw/45ca602bb4d8a71ec2a025cdf25b343d1b30ece7a28e848d826b1392928d3ffe-2026-09-26T03-18-29-110Z-failure
.engine/raw/fced4bfda2e7c962f7910446f91f3515cee1a1e3f8d7d3960cae8c4fd9c63e03-2026-09-26T03-14-02-775Z-failure
.engine/raw/ab97cf9df669e702c49fcd48fae24f06a30b18a2694bc8eb9371335719c6375b-2026-09-27T10-25-41-819Z-failure
.engine/raw/cf8a44fd076b43321d8a2bd28b6ac027df84da4ea25895fb70eb0c6ac5303cf3-2026-09-28T06-34-51-448Z-failure
.engine/raw/4bf1b3e6df078d5c7fa28fa50d954966e5b56876603ad9bb3d70a9e0e0871198-2026-09-30T04-23-36-648Z-failure
.engine/raw/8d9ecc4ce3b0b2f2fd56a2833d98c6eb75717a35ba7ca919cab2f221fd3f634b-2026-09-26T03-05-30-091Z-failure
.engine/raw/93e4547c62d4fdb5241314a311fc2b15c97a8176a8303e49af6f879543bc91ca-2026-09-26T03-15-12-390Z-failure
.engine/raw/4db04877a4686bfce109c1ea3ba61089fc9d9a8841baca9ac2857afd948b5575-2026-09-30T04-23-16-048Z-failure
.engine/raw/964250df1a8ccf0b751b0e04346af9c0946c59968461dbbabe1e78524129c288-2026-09-26T03-10-09-487Z-failure
.engine/raw/0060019c621910f6c7c5f6d896571783367741b6b9dc5c743a3d6785ade18655-2026-09-26T03-22-10-022Z-failure
.engine/raw/e5c0b7b029a3f7cc0f194c0681980c81430b3157739f82a905711d5218d9724c-2026-09-27T10-27-25-004Z-failure
.engine/raw/df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-2026-09-30T03-37-20-210Z-failure
.engine/raw/bcc4543abc75e05652806c6d3ee88c41d2ab84c22a26e226be0d762baaa569ef-2026-09-26T03-23-37-731Z-failure
.engine/raw/fc325346467ff6b17d785bca96d5facc437d45c22a0de504a80e5d71637700da-2026-09-26T03-11-06-487Z-failure
.engine/raw/c56b9a2a5b9aad04c0dd37dca1049dcdf222fa1d0d47b258f09242705e8aa973-2026-09-26T03-20-41-979Z-failure
.engine/raw/3a582b53acb8e6b8d7ba9ef4d7747bd728d801d83fe1d3709df6f9664f42c35a-2026-09-26T03-22-35-361Z-failure
.engine/raw/04dde5efe5d80ce3e3e32368552ee395bdb88c288f32dd9f542152bea26e4a30-2026-09-26T03-11-21-506Z-failure
.engine/raw/20bd33e21391ef50062876d7a343f18c58f65bbd10f2f09d55ba989c5d019ee0-2026-09-26T03-08-42-038Z-failure
.engine/raw/3d0f0c4076d7d16f5b299945aeddba2dbc87aca7a28c49780f99586263a56741-2026-09-26T03-21-29-474Z-failure
.engine/raw/eb770865118534edd8bb2bc9101e56593caccff0569e0f4a55d87f566ec38c5b-2026-09-26T03-13-31-691Z-failure
.engine/raw/4ec98e2e1713a74bc7affffb97eb686f7182d88f9653131e9983e578be964836-2026-09-26T03-05-15-191Z-failure
.engine/raw/22c8211db1acfdb889e1c760d2fc01c80e683b0ef5b9ff0b02af93005857c7d7-2026-09-26T03-09-11-056Z-failure
.engine/raw/f63bef517b24bef4dfd089118d5b9c65ebf5129ba7d0b71c348b79ebfc619d89-2026-09-26T03-11-32-929Z-failure
.engine/raw/3b01eb0d609ae5e40c728f9aef636b204f4148951b3f8369da1700782e09ff26-2026-09-26T03-14-54-924Z-failure
.engine/raw/ddefcf4e000bf0fe0bd6b6a0acbb24daddb7bacd68c0269e431fc82e8d0fac03-2026-09-27T10-09-44-756Z-failure
.engine/raw/a5a85b86e889a5b32705f362b1cf1e11c9ad390869bb52727864560e8c218898-2026-09-26T03-11-17-579Z-failure
.engine/raw/pinnacle-en-browser-1790397298268
.engine/raw/f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-10-37-771Z-failure
.engine/raw/38cb989e2f47dd6a8cdaa10d987dd9b8943066f365d6a2226cfd54ef91af6bd3-2026-09-27T10-24-53-829Z-failure
.engine/raw/2e00e8a12d38a9a21e623c54446a80116d22330ad31c143ee0cb70b602e3ab44-2026-09-26T03-09-18-596Z-failure
.engine/raw/a8e56b90ab993909969807889e82fb728b6ff3f342514cc185fb77242fa581d2-2026-09-26T03-18-32-813Z-failure
.engine/raw/91407339f170f4aaff268f87c16ebf623ac25849c57232c7d5afcee9e24619f1-2026-09-26T03-05-04-029Z-failure
.engine/raw/9e656fc775f266b511cf4202e967edd01a5a847ceff9002ab418c31312f3402f-2026-09-26T03-15-53-612Z-failure
.engine/raw/7e143a64a28385aa4d9411399668294903c3d947988c9808843d5609dfae516a-2026-09-26T03-20-10-424Z-failure
.engine/raw/c4634c095ae39ef2fc07701da8d4556fd4c096a371543c2936342c3d062a5db4-2026-09-26T03-03-32-275Z-failure
.engine/raw/53ea31ae95ddf68edd76b22c707fb4a20152f032396a336fb3a70b4a86fd85d8-2026-09-26T03-20-56-856Z-failure
.engine/raw/df05fb1160ebd07eee1aef3373f657bcbf48e5696d3a2e800d3b3d7c37016419-2026-09-26T03-07-07-391Z-failure
.engine/raw/e4b313998fe16400f1389324e35601a9ede13b3a82fbaead57ce0a3f67498909-2026-09-26T03-13-39-266Z-failure
.engine/raw/0cf241ec57f13992b40d6f154dad5da35fde1bc92f0641d78309d0ee164f63ae-2026-09-26T03-21-40-703Z-failure
.engine/raw/5c3bfdb8a061f06e5dccfddfacfd38a612d228b6668d81fb82710c6e384643cf-2026-09-26T03-07-15-260Z-failure
.engine/raw/18eec8f6f46db19b584597bc76ae8b065432b266db0ab1464a31cf56203ca24d-2026-09-26T03-07-11-459Z-failure
.engine/raw/65b7128f6870db2ff4aad9b6422aa940154f9b60e21fe263a2b6145a0f464918-2026-09-26T03-03-43-782Z-failure
.engine/raw/0869aec289227460cfc3f38e9bd1a67dc6fa2c597d650e6e3e11af733094d424-2026-09-26T03-08-49-548Z-failure
.engine/raw/c587a50a49218e2a2acb732ad2b729f5e38e33c62a841b6a1e4ba121f380b009-2026-09-25T11-19-38-646Z-failure
.engine/raw/e45c5f60d7760b20ea18428dd20a478a0745dc8ae2b4fc46d313e91b3877a5ec-2026-09-26T03-19-35-695Z-failure
```
EXIT: 0
## Subcarpetas de .engine/raw
FUENTE: oddschecker
CARPETA: 0060019c621910f6c7c5f6d896571783367741b6b9dc5c743a3d6785ade18655-2026-09-26T03-22-10-022Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:10.061095+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: betsson
CARPETA: 0258b3efea9558e76cac0b8314753ad695f24d3b807d8fac52131f67e94548d8-2026-09-26T03-11-10-117Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:10.137604+00:00
TAMAÑO: 0.007377 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1085 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: sportsbet
CARPETA: 03b7aa187c9f807a4d2a7290272714cc12d40f5fbd01b1ce73f7d7515cd04d33-2026-09-26T03-04-11-159Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:11.181155+00:00
TAMAÑO: 0.007287 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   991 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: stake
CARPETA: 04921f35417d9ca5ec50a48e00d172817b4c7fa3859437962a8620b5c756c201-2026-09-26T03-18-25-417Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:25.453580+00:00
TAMAÑO: 0.007269 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   972 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: betsafe
CARPETA: 04dde5efe5d80ce3e3e32368552ee395bdb88c288f32dd9f542152bea26e4a30-2026-09-26T03-11-21-506Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:21.537516+00:00
TAMAÑO: 0.007374 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1082 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: stake
CARPETA: 056355036c00b9a1b889270dd626f6dac4f1d38542897ee985ec129158a790d4-2026-09-26T03-13-21-557Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:21.593045+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: stake
CARPETA: 05f09dac180b0455437160606f11c3ca475ad33c67a93c4ee22fb9d1d9b1ffad-2026-09-26T03-08-53-607Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:53.642903+00:00
TAMAÑO: 0.007226 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   927 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: betsson
CARPETA: 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-2026-09-26T09-46-26-898Z-failure
ARCHIVOS: 7
ÚLTIMO: 2026-09-26T09:46:44.071571+00:00
TAMAÑO: 1.546080 MB
ls -lt | head -3:
```text
total 3208
-rw-r--r--@ 1 User  staff     822 Sep 26 16:46 stdout.txt
-rw-r--r--@ 1 User  staff     416 Sep 26 16:46 stderr.txt
```
FUENTE: betsson
CARPETA: 063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-2026-09-26T10-38-08-549Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T10:38:08.620200+00:00
TAMAÑO: 0.096011 MB
ls -lt | head -3:
```text
total 216
-rw-------@ 1 User  staff    913 Sep 26 17:38 context.json
-rw-------@ 1 User  staff  31867 Sep 26 17:38 accessibility.json
```
FUENTE: caliente
CARPETA: 0641baf8b6134ce00ccc73d20dbba801612dd9f59f36e14f5111631e74cdd3a8-2026-09-27T11-06-09-691Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T11:06:10.484665+00:00
TAMAÑO: 20.484536 MB
ls -lt | head -3:
```text
total 41976
-rw-------@ 1 User  staff       799 Sep 27 18:06 context.json
-rw-------@ 1 User  staff  18331719 Sep 27 18:06 accessibility.json
```
FUENTE: tabnz
CARPETA: 06d05410678c68a97ce87d4843883925f1f4ab5b41af7203f9e8de485a5dafe6-2026-09-30T04-24-17-423Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:24:18.811873+00:00
TAMAÑO: 0.583932 MB
ls -lt | head -3:
```text
total 1216
-rw-------@ 1 User  staff     680 Sep 30 11:24 context.json
-rw-------@ 1 User  staff  247720 Sep 30 11:24 accessibility.json
```
FUENTE: betsson
CARPETA: 06e02e833af0fdcf683e395c07001e91a10a51959784f4d127a00d862b8ad14b-2026-09-26T03-12-29-756Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:29.775945+00:00
TAMAÑO: 0.007259 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   962 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: stake
CARPETA: 0758cb9311f3e5447d2ca2080eabe8c84319cc0afad7fbfecd6b5dea6744758c-2026-09-26T03-12-56-259Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:56.313286+00:00
TAMAÑO: 0.007220 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   921 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: sport
CARPETA: 0869aec289227460cfc3f38e9bd1a67dc6fa2c597d650e6e3e11af733094d424-2026-09-26T03-08-49-548Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:49.583230+00:00
TAMAÑO: 0.007229 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   930 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: betfair
CARPETA: 097b094ce33b3de5c4079329c6cdd75c2b093e5e96bf37e935684a46a5a20470-2026-09-26T03-05-48-597Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:48.635789+00:00
TAMAÑO: 0.007314 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1019 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: pinnacle
CARPETA: 0a3c068ecc815ffe86cf6c99298dee5422ad6f79bc875438793deab473b69332-2026-09-26T03-52-58-242Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:52:58.309333+00:00
TAMAÑO: 0.234162 MB
ls -lt | head -3:
```text
total 504
-rw-------@ 1 User  staff     934 Sep 26 10:52 context.json
-rw-------@ 1 User  staff   29341 Sep 26 10:52 accessibility.json
```
FUENTE: sportsbet
CARPETA: 0a4480315cfd68f259c1e5aafb38c13fcdc864c27c6971b1466b66757d593fbb-2026-09-26T03-03-48-388Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:48.409400+00:00
TAMAÑO: 0.007273 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   976 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: betfair
CARPETA: 0b06393c57af59ab925db9a7227cab155e0bf403dd28549b8a5a4498c104b10e-2026-09-26T03-02-43-526Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:43.560204+00:00
TAMAÑO: 0.007299 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1004 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: caliente
CARPETA: 0b5e14b0e89f4d1a1fe98035dfd6aa9d863c9ce6bade91ea91c741c7c402bae8-2026-09-27T10-24-51-165Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:24:51.211507+00:00
TAMAÑO: 0.063117 MB
ls -lt | head -3:
```text
total 160
-rw-------@ 1 User  staff    830 Sep 27 17:24 context.json
-rw-------@ 1 User  staff   5079 Sep 27 17:24 accessibility.json
```
FUENTE: oddspedia
CARPETA: 0b99783c8e848a5079ce84282e4f7a5aa7e9d6a934fdaa9c5fd6c96b557179c9-2026-09-26T03-05-26-206Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:26.243266+00:00
TAMAÑO: 0.007236 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   937 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: sportsbet
CARPETA: 0c3c832b7b55094b944a09078fb0d98515e52e0359967306ba4a0bf3c3cc84dd-2026-09-26T03-13-58-986Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:59.029889+00:00
TAMAÑO: 0.118904 MB
ls -lt | head -3:
```text
total 264
-rw-------@ 1 User  staff    846 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  73459 Sep 26 10:13 accessibility.json
```
FUENTE: stake
CARPETA: 0cf241ec57f13992b40d6f154dad5da35fde1bc92f0641d78309d0ee164f63ae-2026-09-26T03-21-40-703Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:40.737258+00:00
TAMAÑO: 0.007217 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   918 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: superbet
CARPETA: 0d4a49123535d7e62ed4debef57ee9db2ac89701578e922dbce49b891e81a9b4-2026-09-28T06-34-48-500Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-28T06:34:48.550456+00:00
TAMAÑO: 0.238132 MB
ls -lt | head -3:
```text
total 512
-rw-------@ 1 User  staff     957 Sep 28 13:34 context.json
-rw-------@ 1 User  staff   29500 Sep 28 13:34 accessibility.json
```
FUENTE: stake
CARPETA: 0d4fa83013bcce81674f63e85dc5f83c105cd1be2f7a0a221222a9999c7b68b2-2026-09-26T03-22-39-098Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:39.154516+00:00
TAMAÑO: 0.007220 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   921 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: betus
CARPETA: 0e45537efa80351b352ee8177e629d09df28ae4fa4187b76a840fd0a993b2b7f-2026-09-26T03-14-28-821Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:28.843975+00:00
TAMAÑO: 0.007263 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   966 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: betcris
CARPETA: 108336ca4b4400e260268c095fc38089a42e040498f80d880f9f660c1940f661-2026-09-27T10-25-26-643Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:25:26.769805+00:00
TAMAÑO: 0.747016 MB
ls -lt | head -3:
```text
total 1552
-rw-------@ 1 User  staff     712 Sep 27 17:25 context.json
-rw-------@ 1 User  staff  386621 Sep 27 17:25 accessibility.json
```
FUENTE: ph
CARPETA: 108966c7da2ebd67a297b53268be784de97c423075fe39d807ea49671087657f-2026-09-26T03-21-21-867Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:21.888174+00:00
TAMAÑO: 0.007209 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   909 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: irq
CARPETA: 10bf59193f396fb566ab135a5a00518748fced2d1569d4c3ded3daf4d4f73c1d-2026-09-26T03-19-50-758Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:50.795349+00:00
TAMAÑO: 0.007241 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   943 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: ph
CARPETA: 13d532e81457201097aed9416ef63cd0f62d70174b750a32a2f033304d7ffaa3-2026-09-26T03-21-36-999Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:37.037768+00:00
TAMAÑO: 0.007217 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   918 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: stake
CARPETA: 14c6474b905a055abba7ce6bbbfeaf2e953f77331d3a1dd2c42604be753d3e4a-2026-09-26T03-18-40-215Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:40.234692+00:00
TAMAÑO: 0.007343 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1050 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: oddsportal
CARPETA: 1595da0b0da87f15beef45999335354cd457c9e4942f666d9b9f318dfd1ce8de-2026-09-26T03-20-30-953Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:30.974643+00:00
TAMAÑO: 0.007259 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   962 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: betano
CARPETA: 15cfdc4fac99e11a31a41c5dc643b34e11cc2509bca99c6ab1d98a80fc76d874-2026-09-27T10-24-58-125Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:24:58.183545+00:00
TAMAÑO: 0.237473 MB
ls -lt | head -3:
```text
total 512
-rw-------@ 1 User  staff     925 Sep 27 17:24 context.json
-rw-------@ 1 User  staff   29461 Sep 27 17:24 accessibility.json
```
FUENTE: stake
CARPETA: 1605989ceece43e4ae539b0e53d552467a5106ce1551baa6376a08efe220656d-2026-09-26T03-14-17-405Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:17.428164+00:00
TAMAÑO: 0.007286 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   990 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: sportsbet
CARPETA: 1644c64e813418a3f49b9411a9168fa724252b4e9aa10d2befe24e2da5ae6e2e-2026-09-26T03-05-44-918Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:44.937517+00:00
TAMAÑO: 0.007281 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   985 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: stake
CARPETA: 17c85b0772ebe6a923ec406955998a3b2c3a22556b878037ad7a7f27f7a1c1a0-2026-09-26T03-22-02-342Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:02.376799+00:00
TAMAÑO: 0.007246 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   948 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: pinnacle
CARPETA: 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-2026-09-26T04-34-35-503Z-failure
ARCHIVOS: 7
ÚLTIMO: 2026-09-26T04:35:20.156315+00:00
TAMAÑO: 0.074470 MB
ls -lt | head -3:
```text
total 200
-rw-r--r--@ 1 User  staff    794 Sep 26 11:35 stdout.txt
-rw-r--r--@ 1 User  staff    416 Sep 26 11:35 stderr.txt
```
FUENTE: pinnacle
CARPETA: 18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-2026-09-27T04-38-34-043Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T04:38:34.294853+00:00
TAMAÑO: 3.068622 MB
ls -lt | head -3:
```text
total 6304
-rw-------@ 1 User  staff      816 Sep 27 11:38 context.json
-rw-------@ 1 User  staff  2236626 Sep 27 11:38 accessibility.json
```
FUENTE: sportsbook
CARPETA: 18eec8f6f46db19b584597bc76ae8b065432b266db0ab1464a31cf56203ca24d-2026-09-26T03-07-11-459Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:11.495791+00:00
TAMAÑO: 0.007268 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   971 Sep 26 10:07 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:07 accessibility.json
```
FUENTE: stake
CARPETA: 1b2726d90804096b2d9a66f1bd2b85754347aa57a9f8552ec5fe6f4355610b34-2026-09-26T03-11-52-041Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:52.076004+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: stake
CARPETA: 1c1a74a77319ce9af82026a883ff561cfa81237188f0d66bdf65792519a3764f-2026-09-26T03-10-41-494Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:41.533149+00:00
TAMAÑO: 0.007252 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   954 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betfair
CARPETA: 1c26c2fd1f0053d6ccde1233c63ecfc35c093856ed553bc15805aeaaf0727629-2026-09-26T03-23-08-631Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:08.667771+00:00
TAMAÑO: 0.007245 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   947 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:23 accessibility.json
```
FUENTE: oddsportal
CARPETA: 1c57c20fff4c167733466c8f2b54b7b4a23f20a37bdbe0850711c0e45e523169-2026-09-26T03-20-03-048Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:03.067882+00:00
TAMAÑO: 0.007291 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   995 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: oddspedia
CARPETA: 1d64526cc5619f0e7443280528b1754608ef2ef9d2ec22b2c5c3f8ef9adddf8c-2026-09-26T03-04-22-360Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:22.397655+00:00
TAMAÑO: 0.007287 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   991 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: betsson
CARPETA: 1f194ac306a5776b0a8df6b979f7616df0bbcd2dba7756af08550d8e9e7215e3-2026-09-26T03-14-47-575Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:47.596266+00:00
TAMAÑO: 0.007274 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   977 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: betonline
CARPETA: 20bd33e21391ef50062876d7a343f18c58f65bbd10f2f09d55ba989c5d019ee0-2026-09-26T03-08-42-038Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:42.072604+00:00
TAMAÑO: 0.007359 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1066 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: stake
CARPETA: 2106c7f51c0f6f31db88a33488c00fc3a1809fe81f859cad7bcc9a2fce7f8a8b-2026-09-26T03-09-14-917Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:14.955125+00:00
TAMAÑO: 0.007263 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   966 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: betus
CARPETA: 212e2bfc27024a34ee64f3bfa64f9fc9409679c547ecafaa2fc9a72b0a49fa03-2026-09-26T03-06-18-451Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:06:18.471923+00:00
TAMAÑO: 0.007286 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   990 Sep 26 10:06 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:06 accessibility.json
```
FUENTE: ph
CARPETA: 2265bc80a709cbfe48e93f50f8d306287dc5508c5b07dfa23a9c7938e4a975cc-2026-09-26T03-21-10-627Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:10.666483+00:00
TAMAÑO: 0.007220 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   921 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: betfair
CARPETA: 22c8211db1acfdb889e1c760d2fc01c80e683b0ef5b9ff0b02af93005857c7d7-2026-09-26T03-09-11-056Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:11.075632+00:00
TAMAÑO: 0.007360 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1067 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: oddsportal
CARPETA: 22d63039fd81e8314afae7b2aa71afc12467b5932e26f4bc9af76b0aee1f9842-2026-09-26T03-13-09-328Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:09.365936+00:00
TAMAÑO: 0.007236 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   938 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: stake
CARPETA: 240291af7af8734e762f5bedfa1d323f166335090db1c74ee959673bfd1ccf77-2026-09-26T03-22-46-765Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:46.802324+00:00
TAMAÑO: 0.007226 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   927 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: stake
CARPETA: 2494842d584819edbd7c02b200f2dca86a194499b65f1014321d101048c7d2a3-2026-09-26T03-09-33-912Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:33.933197+00:00
TAMAÑO: 0.007275 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   978 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: bet9ja
CARPETA: 2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-2026-09-30T03-53-54-979Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T03:53:56.777812+00:00
TAMAÑO: 0.132461 MB
ls -lt | head -3:
```text
total 288
-rw-------@ 1 User  staff     783 Sep 30 10:53 context.json
-rw-------@ 1 User  staff    3393 Sep 30 10:53 accessibility.json
```
FUENTE: stake
CARPETA: 2854a1746395bb3d11b1599bd36605673d2eaa8a63aeb4bf53e1ea6b0f4635e4-2026-09-26T03-21-33-176Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:33.196022+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: stake
CARPETA: 285cebde3f04d8c9a7178563c17afca81c3e2147acbcf76273e0687acf02b556-2026-09-26T03-09-48-573Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:48.611032+00:00
TAMAÑO: 0.007300 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1005 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: betsson
CARPETA: 29202e9b0a185b7c1ea24828f483f2e5965950999cb466759d4f056a22a9aaee-2026-09-26T03-11-55-828Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:55.863982+00:00
TAMAÑO: 0.007279 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   983 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: betmgm
CARPETA: 2923d757681e7e4733bc8d9581d001c08c16afb4c224347ef581bfa56f6572bc-2026-09-26T03-22-53-171Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:53.203486+00:00
TAMAÑO: 0.061476 MB
ls -lt | head -3:
```text
total 152
-rw-------@ 1 User  staff    853 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  28006 Sep 26 10:22 accessibility.json
```
FUENTE: betfair
CARPETA: 2936bd032abb95fb9e7d1f49460611de01d380e16ab099d4a743be6da2c4cdc1-2026-09-26T03-10-37-781Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:37.817589+00:00
TAMAÑO: 0.007314 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1019 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: oddsportal
CARPETA: 2a806f1be88627685585babc2d14b497c938cec6fe65d82f9feaae482163f97d-2026-09-26T03-05-22-498Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:22.535117+00:00
TAMAÑO: 0.007239 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   941 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: sportsbet
CARPETA: 2a8cf6c4307d16f5ae924aed415cd50a2cf64926d9d3f0f627ed704cbec49285-2026-09-26T03-10-14-589Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:14.611253+00:00
TAMAÑO: 0.007350 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1057 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: winpot
CARPETA: 2ac53fec9262defde87d2bced7db878ed251b2637dddbc0f54b0cca9b43fc2ac-2026-09-27T10-16-07-371Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:16:07.468482+00:00
TAMAÑO: 0.779803 MB
ls -lt | head -3:
```text
total 1624
-rw-------@ 1 User  staff     813 Sep 27 17:16 context.json
-rw-------@ 1 User  staff  453200 Sep 27 17:16 accessibility.json
```
FUENTE: stake
CARPETA: 2ac572d6e50f83cfdaefa5ad18788779270a0f2cb0fcf457fab901289f2a2a18-2026-09-26T03-16-37-207Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:37.245417+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: sportsbet
CARPETA: 2b44d2229a2d63b76b7fa39392b2b38071f84ff2b40d3e702cea90c6a6cafc94-2026-09-30T04-26-52-854Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:26:53.297672+00:00
TAMAÑO: 1.610601 MB
ls -lt | head -3:
```text
total 3320
-rw-------@ 1 User  staff      738 Sep 30 11:26 context.json
-rw-------@ 1 User  staff   218544 Sep 30 11:26 accessibility.json
```
FUENTE: sportsbet
CARPETA: 2cb665492cdc3c9680ca8a7b01d57b6c4d57c9db05ffa8890cb6dc07604d8195-2026-09-26T03-11-02-841Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:02.877098+00:00
TAMAÑO: 0.007318 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1024 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: betsson
CARPETA: 2e00e8a12d38a9a21e623c54446a80116d22330ad31c143ee0cb70b602e3ab44-2026-09-26T03-09-18-596Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:18.637767+00:00
TAMAÑO: 0.007331 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1037 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: oddspedia
CARPETA: 2e38fc44534ed375a966695e2d6097dad07c5a7b0aacd8a029e42d5189b04310-2026-09-26T03-12-52-574Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:52.610457+00:00
TAMAÑO: 0.007230 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   931 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: oddshub
CARPETA: 2f2f6b98f792016328319bd011296bc38389f444a7bd37c317984490b7974d1d-2026-09-26T03-23-30-413Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:30.587322+00:00
TAMAÑO: 1.082461 MB
ls -lt | head -3:
```text
total 2240
-rw-------@ 1 User  staff     774 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  649867 Sep 26 10:23 accessibility.json
```
FUENTE: oddshub
CARPETA: 2f759b3bc377b98cd1d9a8ba988dc1e379a9c1e173331e31a01e21a77fa35b62-2026-09-26T03-22-17-092Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:17.278357+00:00
TAMAÑO: 1.125669 MB
ls -lt | head -3:
```text
total 2320
-rw-------@ 1 User  staff     744 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  681483 Sep 26 10:22 accessibility.json
```
FUENTE: sportsbet
CARPETA: 2fb0e7df38caac9bd8cd472fde4d99d5f1ae8d09153844ea8c4ad09762391f9d-2026-09-26T03-02-58-249Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:58.291006+00:00
TAMAÑO: 0.007267 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   970 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: 1xbet
CARPETA: 2ff544421ca41e8006758d0f90dd5645e7f3795cdbdadf8e053f8d4b265fe650-2026-09-27T10-27-06-554Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:27:07.794276+00:00
TAMAÑO: 0.887158 MB
ls -lt | head -3:
```text
total 1840
-rw-------@ 1 User  staff     719 Sep 27 17:27 context.json
-rw-------@ 1 User  staff  548397 Sep 27 17:27 accessibility.json
```
FUENTE: sportsbook
CARPETA: 326d7d86db23f31ad3432d7593de00fef8bb62d558815d1f802802e0d3f0fccd-2026-09-26T03-07-26-844Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:26.890785+00:00
TAMAÑO: 0.007345 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1052 Sep 26 10:07 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:07 accessibility.json
```
FUENTE: 1xbet
CARPETA: 331372e63694894dc1cb20f7a76518a0a614f3c7ae18791cb8cb13808782d63a-2026-09-27T10-24-56-544Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:24:56.600788+00:00
TAMAÑO: 0.237264 MB
ls -lt | head -3:
```text
total 512
-rw-------@ 1 User  staff     920 Sep 27 17:24 context.json
-rw-------@ 1 User  staff   29456 Sep 27 17:24 accessibility.json
```
FUENTE: next
CARPETA: 33a437f750112e158ec241c1269fbc7e36307b59d552333c0c2c6a8d76f47b80-2026-09-26T03-15-02-257Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:02.294848+00:00
TAMAÑO: 0.007262 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   965 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: ph
CARPETA: 3400732a893f7b5e7f844fe62686664c1711eb3bb1382d1e4cf980fdb0b38b21-2026-09-26T03-20-14-213Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:14.236063+00:00
TAMAÑO: 0.007223 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   924 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: oddspedia
CARPETA: 3551e7e09b6405f4430085a42a702ae20ba0a9ac86e7c566a87c36297fcebc04-2026-09-26T03-15-19-805Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:19.826896+00:00
TAMAÑO: 0.007238 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   940 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: betfair
CARPETA: 35b42888090eae7b2699cf9da6a886c02927fafe08f10bab73b61f849010b75a-2026-09-26T03-22-06-179Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:06.216471+00:00
TAMAÑO: 0.007294 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   998 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: ph
CARPETA: 3610406a8a35ff59423d520116fbb030fa97b45e82f8641e8776fec8427a7cbb-2026-09-26T03-20-27-302Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:27.321534+00:00
TAMAÑO: 0.007197 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   897 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: stake
CARPETA: 37ecf0a1e92de20faf05dd824a12d2dd92d77e871d9b603b12353e26b994bf11-2026-09-26T03-09-37-707Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:37.731308+00:00
TAMAÑO: 0.007283 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   987 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: oddsportal
CARPETA: 37f2ba42414503255cb0bc0f21f0ec993acf75ec887a4c5d2590791342a6deaa-2026-09-26T03-05-07-725Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:07.761311+00:00
TAMAÑO: 0.007236 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   938 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: playdoit
CARPETA: 38cb989e2f47dd6a8cdaa10d987dd9b8943066f365d6a2226cfd54ef91af6bd3-2026-09-27T10-24-53-829Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:24:54.050675+00:00
TAMAÑO: 0.679951 MB
ls -lt | head -3:
```text
total 1416
-rw-------@ 1 User  staff     692 Sep 27 17:24 context.json
-rw-------@ 1 User  staff   58870 Sep 27 17:24 accessibility.json
```
FUENTE: oddshub
CARPETA: 395d70fe436f0960a96a8e3dad4cee63a68225615e41db355fe8083041788165-2026-09-26T03-23-58-936Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:59.113525+00:00
TAMAÑO: 1.195075 MB
ls -lt | head -3:
```text
total 2464
-rw-------@ 1 User  staff     759 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  738162 Sep 26 10:23 accessibility.json
```
FUENTE: ph
CARPETA: 396ab4a4b9c8a72eb41f8b0e3898cada53fcc924c405804bb05f7a2ba5f56b69-2026-09-26T03-21-00-594Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:00.613838+00:00
TAMAÑO: 0.007215 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   915 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: stake
CARPETA: 3a582b53acb8e6b8d7ba9ef4d7747bd728d801d83fe1d3709df6f9664f42c35a-2026-09-26T03-22-35-361Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:35.395617+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: stake
CARPETA: 3b01eb0d609ae5e40c728f9aef636b204f4148951b3f8369da1700782e09ff26-2026-09-26T03-14-54-924Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:54.943125+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: sportsbet
CARPETA: 3b1861dc4277f7f15ff568496b9bb2d4bca63803eda94e2899a45759f28635df-2026-09-26T03-16-03-810Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:03.837042+00:00
TAMAÑO: 0.118890 MB
ls -lt | head -3:
```text
total 264
-rw-------@ 1 User  staff    836 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  73454 Sep 26 10:16 accessibility.json
```
FUENTE: stake
CARPETA: 3bd1703cb4994589881c49e268d8a42e6e0a22f0bcb06ef42354a767506c75aa-2026-09-26T03-16-33-496Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:33.522758+00:00
TAMAÑO: 0.007280 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   984 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: pinnacle
CARPETA: 3d0f0c4076d7d16f5b299945aeddba2dbc87aca7a28c49780f99586263a56741-2026-09-26T03-21-29-474Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:29.526864+00:00
TAMAÑO: 0.007277 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   981 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: stake
CARPETA: 3d8073349700ef8e6b3ffa75e32e3955e94adee3c61e51c72b8a250f383097b0-2026-09-26T03-12-25-928Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:25.949486+00:00
TAMAÑO: 0.007220 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   921 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: stake
CARPETA: 3deb2d2176ab4084e85ea0c8d86df97b22a41b11edce90c17b84b7584ec58a55-2026-09-26T03-11-28-917Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:28.954846+00:00
TAMAÑO: 0.007312 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1017 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: ph
CARPETA: 3eda3e4475e060a192f65fe822c34d34b70126ec929636ebbda984cd67c824c7-2026-09-26T03-20-45-764Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:45.801125+00:00
TAMAÑO: 0.007212 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   912 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: oddschecker
CARPETA: 42089f96c378c750ad024e40fabf316e3c2bdb0ff489ab88e4d6234ea8703703-2026-09-26T03-05-37-419Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:37.443521+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: oddschecker
CARPETA: 44163116a00a384e80dd2279ca11b1db5f2a969a7ae12bd84c11ca98544cbb27-2026-09-26T03-05-11-400Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:11.419183+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: ladbrokes
CARPETA: 44a264d5a28fadaa153d915e67695840dfe7270ec5bcdd0f14c893baff864294-2026-09-26T03-19-39-379Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:39.412905+00:00
TAMAÑO: 0.007287 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   991 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: stake
CARPETA: 45ca602bb4d8a71ec2a025cdf25b343d1b30ece7a28e848d826b1392928d3ffe-2026-09-26T03-18-29-110Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:29.146697+00:00
TAMAÑO: 0.007229 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   930 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: stake
CARPETA: 4660dff78e9f6757e615cc31df75934c60e011039156b95981da3c99fcfe0fb6-2026-09-26T03-21-06-980Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:07.016570+00:00
TAMAÑO: 0.007243 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   945 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: betsson
CARPETA: 480f794de2a1b826a76c68cfc75304dccb145d64be4b79ca1f097292ceb84d7c-2026-09-26T09-41-18-343Z-failure
ARCHIVOS: 7
ÚLTIMO: 2026-09-26T09:41:26.633360+00:00
TAMAÑO: 0.011986 MB
ls -lt | head -3:
```text
total 64
-rw-r--r--@ 1 User  staff   804 Sep 26 16:41 stdout.txt
-rw-r--r--@ 1 User  staff   416 Sep 26 16:41 stderr.txt
```
FUENTE: betsson
CARPETA: 480f794de2a1b826a76c68cfc75304dccb145d64be4b79ca1f097292ceb84d7c-2026-09-26T09-45-28-355Z-failure
ARCHIVOS: 7
ÚLTIMO: 2026-09-26T09:45:37.157010+00:00
TAMAÑO: 2.332231 MB
ls -lt | head -3:
```text
total 4816
-rw-r--r--@ 1 User  staff      804 Sep 26 16:45 stdout.txt
-rw-r--r--@ 1 User  staff      416 Sep 26 16:45 stderr.txt
```
FUENTE: oddspedia
CARPETA: 492fd358a32f9b13eb106f438b54378cf6efc2c0a3c9d691eff436bf630368ac-2026-09-26T03-02-54-490Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:54.525914+00:00
TAMAÑO: 0.007233 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   934 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: betfair
CARPETA: 4936891ea5129a3962640cebc9122701c0431b0e25cdfde8ab73d4b60c86f332-2026-09-26T03-16-07-480Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:07.513521+00:00
TAMAÑO: 0.007305 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1010 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: oddspedia
CARPETA: 4bd32e6f92bfe6876c8106e36c65f81a9fdfcd73e2e4c674d1d6e42a23da7555-2026-09-26T03-03-55-657Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:55.678911+00:00
TAMAÑO: 0.007244 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   946 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: tabnz
CARPETA: 4bf1b3e6df078d5c7fa28fa50d954966e5b56876603ad9bb3d70a9e0e0871198-2026-09-30T04-23-36-648Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:23:39.037871+00:00
TAMAÑO: 0.848703 MB
ls -lt | head -3:
```text
total 1760
-rw-------@ 1 User  staff     693 Sep 30 11:23 context.json
-rw-------@ 1 User  staff  294224 Sep 30 11:23 accessibility.json
```
FUENTE: winpot
CARPETA: 4cfa598615dba77f7a2e18d53acae7790f9bbe44f2c55f2bfc63a2a03a3403f9-2026-09-27T10-09-31-387Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:09:33.768305+00:00
TAMAÑO: 0.484008 MB
ls -lt | head -3:
```text
total 1016
-rw-------@ 1 User  staff     852 Sep 27 17:09 context.json
-rw-------@ 1 User  staff   11859 Sep 27 17:09 accessibility.json
```
FUENTE: betfair
CARPETA: 4d06b69f5db29022a6b95e1dcb7738dbb80b46ca6f00d3a04d374fe9e44c2b3d-2026-09-26T03-13-52-347Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:52.401464+00:00
TAMAÑO: 0.007334 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1040 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: tabnz
CARPETA: 4db04877a4686bfce109c1ea3ba61089fc9d9a8841baca9ac2857afd948b5575-2026-09-30T04-23-16-048Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:23:16.719946+00:00
TAMAÑO: 0.852207 MB
ls -lt | head -3:
```text
total 1768
-rw-------@ 1 User  staff     691 Sep 30 11:23 context.json
-rw-------@ 1 User  staff  298655 Sep 30 11:23 accessibility.json
```
FUENTE: oddsportal
CARPETA: 4dc211639893393f5e15c678813c159b53089950cf78edd1c35d9f40ca4453e6-2026-09-26T03-05-41-086Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:41.105610+00:00
TAMAÑO: 0.007251 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   953 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: sportsbet
CARPETA: 4ec98e2e1713a74bc7affffb97eb686f7182d88f9653131e9983e578be964836-2026-09-26T03-05-15-191Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:15.226251+00:00
TAMAÑO: 0.007267 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   970 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: tabnz
CARPETA: 5084a63b8949092b127ac21b5e963974ea70a7f8135a1ed8482f346766c6e0e5-2026-09-30T04-23-55-243Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:23:55.483307+00:00
TAMAÑO: 2.666396 MB
ls -lt | head -3:
```text
total 5480
-rw-------@ 1 User  staff      658 Sep 30 11:23 context.json
-rw-------@ 1 User  staff  1915157 Sep 30 11:23 accessibility.json
```
FUENTE: betsson
CARPETA: 53581623e18731487b2058d25ff0f73de5806ee3b49d01df87a060d35493addc-2026-09-26T03-15-23-531Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:23.569012+00:00
TAMAÑO: 0.007268 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   971 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: stake
CARPETA: 53ea31ae95ddf68edd76b22c707fb4a20152f032396a336fb3a70b4a86fd85d8-2026-09-26T03-20-56-856Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:56.894839+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: betfair
CARPETA: 543cbfa76616ae3813e3ab5f6d67363908d3a6106bccc6adabe12c8ca3191ae1-2026-09-26T03-14-06-414Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:06.436226+00:00
TAMAÑO: 0.007325 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1031 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: stake
CARPETA: 549e6efbe53bba411ea934eb0a87300c352447f1fd782ff63f95c766dff5c499-2026-09-26T03-06-22-132Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:06:22.167458+00:00
TAMAÑO: 0.007215 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   915 Sep 26 10:06 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:06 accessibility.json
```
FUENTE: sportsbet
CARPETA: 555374132fc5defdecde365c71610b64e74ce1b01f0a7baf6a0a03102fc2fd48-2026-09-26T03-11-13-890Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:13.928221+00:00
TAMAÑO: 0.007313 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1018 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: oddsportal
CARPETA: 59bea850b78b40d146245fa45bf738e798fd54f668ed986295530ea55d2207b5-2026-09-26T03-15-16-165Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:16.201525+00:00
TAMAÑO: 0.007242 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   944 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: sportsbet
CARPETA: 5af6937ed86182455a116b0807d9838f9ae2b17aafe9a2177c6b4375409c6828-2026-09-26T03-18-51-865Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:51.899757+00:00
TAMAÑO: 0.007270 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   973 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: oddsportal
CARPETA: 5b2505f3a8ba81e40875629c4f1a7896663cc0f34a0e9aa6cff1deb67913479f-2026-09-26T03-13-05-672Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:05.692716+00:00
TAMAÑO: 0.007234 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   935 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: stake
CARPETA: 5c135cc605ffe49b53b5ddfa0df6a4432f1ef46e31ee3e08c37ba173dd900f0b-2026-09-26T03-12-22-093Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:22.128587+00:00
TAMAÑO: 0.007223 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   924 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: betonline
CARPETA: 5c3bfdb8a061f06e5dccfddfacfd38a612d228b6668d81fb82710c6e384643cf-2026-09-26T03-07-15-260Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:15.296139+00:00
TAMAÑO: 0.007333 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1039 Sep 26 10:07 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:07 accessibility.json
```
FUENTE: stake
CARPETA: 5d6b6dda2b952c66a08215f461fb976df498eb7e31a33171ff29f7140774fc9b-2026-09-26T03-23-12-383Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:12.405461+00:00
TAMAÑO: 0.007255 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   957 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:23 accessibility.json
```
FUENTE: stake
CARPETA: 5ddae3ea8cdb6ee980fdcaefbcbc4c969580fec849e867b402213a9d10a55032-2026-09-26T03-14-36-962Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:36.997892+00:00
TAMAÑO: 0.007235 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   936 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: oddschecker
CARPETA: 5df714049ddd181559482594d64ce55f00d6172e262fdc774aa6b3ef93f89b56-2026-09-26T03-03-05-568Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:05.602469+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: oddschecker
CARPETA: 5e466f4fd0f6c7d4d7d3abb8777bbed335d8bb1b7b7503602e436bd20f7688f4-2026-09-26T03-05-52-260Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:52.280070+00:00
TAMAÑO: 0.007252 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   954 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: stake
CARPETA: 5e4a06bb863e40af83448ba48e3f646cd8765f24906eaebe3b666d62de997c66-2026-09-26T03-19-54-473Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:54.492471+00:00
TAMAÑO: 0.007255 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   957 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: oddsportal
CARPETA: 5f4fa417b3e8f7bce601bad74a2d8d9abde025e1ce0eec2a5556f736ea54aa5a-2026-09-26T03-21-48-208Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:48.231547+00:00
TAMAÑO: 0.007254 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   956 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: betfair
CARPETA: 5f7df4958b5861988c66dfbe7dcebf639a3b5af41a904f2a7f9d658e14b21723-2026-09-26T03-12-07-027Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:07.060087+00:00
TAMAÑO: 0.007322 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1028 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: oddsportal
CARPETA: 603bd1076ed5a30a538025b28c9790f51e6e651d435bf51069d201a7544435e2-2026-09-26T03-14-33-318Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:33.342941+00:00
TAMAÑO: 0.007248 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   950 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: betsson
CARPETA: 6067fbb25ec02c7fa3400cd665ab217cb6bf89463a5971a1a3765e714fb60607-2026-09-26T03-16-14-931Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:14.966607+00:00
TAMAÑO: 0.007265 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   968 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: oddschecker
CARPETA: 608a9c057f81d37ceda5cadc3819b018b230fe7160c428694776c8eb425eb0a5-2026-09-26T03-12-18-241Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:18.276462+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: sportsbet
CARPETA: 60aaaf7092f3d1fd3ac5f2b129da6c310e4451a8362b17a3ab0e0dafd556c84e-2026-09-26T03-10-26-420Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:26.454131+00:00
TAMAÑO: 0.007479 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1192 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betfair
CARPETA: 60d5cbd06addd55be955f7c9958e1b75e990ef5529498f716a83d9dc98b2ad55-2026-09-26T03-14-51-290Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:51.310874+00:00
TAMAÑO: 0.007325 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1031 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: winpot
CARPETA: 61615c3a40d69983ff69793af2715edb5964dcd888a34bdb90905c3b8fdb4a61-2026-09-27T10-10-15-100Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:10:16.351825+00:00
TAMAÑO: 0.488363 MB
ls -lt | head -3:
```text
total 1024
-rw-------@ 1 User  staff     856 Sep 27 17:10 context.json
-rw-------@ 1 User  staff   11861 Sep 27 17:10 accessibility.json
```
FUENTE: ladbrokes
CARPETA: 61c0999c4774f7274238895df5e349c6f2d107d73b24409fd450cc9a518c7033-2026-09-26T03-18-48-028Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:48.047011+00:00
TAMAÑO: 0.007301 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1006 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: betfair
CARPETA: 62a37f4444dacdd0ff1a1e2f804ff08ac72170fc24197c89b07adfed6a96a16f-2026-09-26T03-03-20-971Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:20.992843+00:00
TAMAÑO: 0.007319 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1025 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: sportsbet
CARPETA: 62a6b1914e212c5d94ad4bf74fee88d6e0a9e7d833c61a8403d840e5f0b97d65-2026-09-26T03-14-43-858Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:43.891355+00:00
TAMAÑO: 0.118898 MB
ls -lt | head -3:
```text
total 264
-rw-------@ 1 User  staff    842 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  73457 Sep 26 10:14 accessibility.json
```
FUENTE: playdoit
CARPETA: 62a98c9e5852b44e47b01365555777ba62d52c63b827de4e6a3031d511eb164a-2026-09-27T10-27-03-142Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:27:03.223979+00:00
TAMAÑO: 0.527390 MB
ls -lt | head -3:
```text
total 1096
-rw-------@ 1 User  staff     776 Sep 27 17:27 context.json
-rw-------@ 1 User  staff   84724 Sep 27 17:27 accessibility.json
```
FUENTE: stake
CARPETA: 62fd71b0c270763e2a688891ae5f8a11d7245c4d76f84654fb7bce6120868dbf-2026-09-26T03-13-12-976Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:13.011671+00:00
TAMAÑO: 0.007223 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   924 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: stake
CARPETA: 6372e0adfe1b9d7d0c6370abed0b9a8732d621a70ae9841a1b0d1cf178bb2561-2026-09-26T03-23-15-997Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:16.035264+00:00
TAMAÑO: 0.007320 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1026 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:23 accessibility.json
```
FUENTE: sport
CARPETA: 6445f892d6d3db2a5c0bdc41fb9c420dde9e1be023ae7564c09059c8b2eda63b-2026-09-26T03-08-23-056Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:23.109833+00:00
TAMAÑO: 0.007235 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   936 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: stake
CARPETA: 6541d8ae8194656901c0d5907dd8d52381c1a78ae97ada1797917ec6e377ad58-2026-09-26T03-15-05-986Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:06.017975+00:00
TAMAÑO: 0.007229 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   930 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: oddshub
CARPETA: 65ab18dae7751723e6bcc853895b74a432bf86704190617fd01516582cd975ed-2026-09-26T03-23-44-926Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:45.112342+00:00
TAMAÑO: 1.090554 MB
ls -lt | head -3:
```text
total 2256
-rw-------@ 1 User  staff     771 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  649749 Sep 26 10:23 accessibility.json
```
FUENTE: actionnetwork
CARPETA: 65b7128f6870db2ff4aad9b6422aa940154f9b60e21fe263a2b6145a0f464918-2026-09-26T03-03-43-782Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:44.568704+00:00
TAMAÑO: 6.757100 MB
ls -lt | head -3:
```text
total 13856
-rw-------@ 1 User  staff      834 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2751581 Sep 26 10:03 accessibility.json
```
FUENTE: oddshub
CARPETA: 683bb0661b67446d62d9097434e4038bf1c4b0b47b60da2dae2e1af0eeb43c07-2026-09-26T03-24-13-838Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:24:14.014400+00:00
TAMAÑO: 1.158588 MB
ls -lt | head -3:
```text
total 2400
-rw-------@ 1 User  staff     753 Sep 26 10:24 context.json
-rw-------@ 1 User  staff  708755 Sep 26 10:24 accessibility.json
```
FUENTE: betsson
CARPETA: 68d14ee70dc0d7ae637de04a9b7679cd318f9ec90be0802676d25f90c2cd77c2-2026-09-26T03-15-31-047Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:31.083544+00:00
TAMAÑO: 0.007274 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   977 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: oddspedia
CARPETA: 69365748ab68ddb6b20c091fb61e0eed89ef895cc81600427c36f4c8b69a3311-2026-09-26T03-12-37-208Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:37.236350+00:00
TAMAÑO: 0.007236 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   937 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: oddshub
CARPETA: 6a82a3f49144d3ae67bf19b76588d0d780bd775dccb16129155af298c232e2cd-2026-09-26T03-23-22-991Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:23.182899+00:00
TAMAÑO: 1.091570 MB
ls -lt | head -3:
```text
total 2256
-rw-------@ 1 User  staff     747 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  649631 Sep 26 10:23 accessibility.json
```
FUENTE: actionnetwork
CARPETA: 6acd554c29231439caa52f1742395d54005d34c815adb75318034b895fb3fc07-2026-09-26T03-04-03-051Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:03.720179+00:00
TAMAÑO: 5.527137 MB
ls -lt | head -3:
```text
total 11344
-rw-------@ 1 User  staff      830 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2486609 Sep 26 10:04 accessibility.json
```
FUENTE: betonline
CARPETA: 6b2c80026e8568d9c7c355bc82b0c21add8b60e54a3c34f661d49f962d13f853-2026-09-26T03-08-26-951Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:26.987738+00:00
TAMAÑO: 0.007281 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   985 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: betcha
CARPETA: 6bb7cb040f6d1ff811e68ad754bc92e0447018593c6061d1a3f7fd5a4db6d20e-2026-09-30T04-26-16-562Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:26:18.407248+00:00
TAMAÑO: 0.426639 MB
ls -lt | head -3:
```text
total 896
-rw-------@ 1 User  staff     683 Sep 30 11:26 context.json
-rw-------@ 1 User  staff  135206 Sep 30 11:26 accessibility.json
```
FUENTE: sport
CARPETA: 6bfc9e11cd457497c85a04e79a2dae4c2495a4f48dfc979907a1167831dcee42-2026-09-26T03-07-30-553Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:30.572870+00:00
TAMAÑO: 0.007220 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   921 Sep 26 10:07 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:07 accessibility.json
```
FUENTE: pinnacle
CARPETA: 6dd24eec3bf8f479f7cc85b4792d23013d17662af6a2c5669a388d6a6954babb-2026-09-26T03-20-53-143Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:53.183023+00:00
TAMAÑO: 0.007312 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1017 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: betfair
CARPETA: 6dd8c889d6cffd4de9b94c443f14ec3e23868de273d070d48227cd1ca40feb66-2026-09-26T03-15-49-648Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:49.685799+00:00
TAMAÑO: 0.007308 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1013 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: sportsbet
CARPETA: 70d4c83c2b9b36c20a3a7b1f07587b71e5cbf8d48e312bc3750432988126160f-2026-09-26T03-04-35-691Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:35.726033+00:00
TAMAÑO: 0.007298 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1003 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: betfair
CARPETA: 742008bb949bae75f29cc4621f0113095645e78ed8e4a0cc88ae2757b4979d0d-2026-09-26T03-13-35-374Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:35.409457+00:00
TAMAÑO: 0.007339 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1046 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: betsson
CARPETA: 749dee89cbf729736ac119a4e395142b0800f29ab6d4ab7ef5b858ed670bd2d9-2026-09-26T03-17-51-632Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:17:51.667678+00:00
TAMAÑO: 0.007251 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   953 Sep 26 10:17 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:17 accessibility.json
```
FUENTE: stake
CARPETA: 76523c71585ce089991d06b195685fda29e1e40fa1142373f9bae4f6b3e0484b-2026-09-26T03-17-59-018Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:17:59.044369+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:17 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:17 accessibility.json
```
FUENTE: sportsbet
CARPETA: 76db39f404c58a9c0e0584f1c5496f31d1d2e99848eee5bdd24d0294b603a3f2-2026-09-26T03-13-28-049Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:28.077470+00:00
TAMAÑO: 0.118934 MB
ls -lt | head -3:
```text
total 264
-rw-------@ 1 User  staff    862 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  73463 Sep 26 10:13 accessibility.json
```
FUENTE: actionnetwork
CARPETA: 76db8066a4b3da4293e0dcbcea95e18038d76c401d2b1181164180bd666da6e5-2026-09-26T03-04-59-924Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:00.281807+00:00
TAMAÑO: 4.159923 MB
ls -lt | head -3:
```text
total 8544
-rw-------@ 1 User  staff      821 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  1987118 Sep 26 10:05 accessibility.json
```
FUENTE: winpot
CARPETA: 7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-2026-09-27T10-15-48-693Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:15:48.840130+00:00
TAMAÑO: 0.604720 MB
ls -lt | head -3:
```text
total 1256
-rw-------@ 1 User  staff     816 Sep 27 17:15 context.json
-rw-------@ 1 User  staff  274282 Sep 27 17:15 accessibility.json
```
FUENTE: oddschecker
CARPETA: 792e540a21f2736d2dde5c823d6f873ff8f26c5e29d4f13c464684b6ad5b63aa-2026-09-26T03-10-01-929Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:01.962129+00:00
TAMAÑO: 0.007298 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1002 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: stake
CARPETA: 7e143a64a28385aa4d9411399668294903c3d947988c9808843d5609dfae516a-2026-09-26T03-20-10-424Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:10.466738+00:00
TAMAÑO: 0.007246 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   948 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: muaythai2000
CARPETA: 7e3d4c3d85af9884bdf5cf10e2691059358ee50126cf7d5718c7e60db105d62b-2026-09-26T03-06-14-274Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:06:14.747846+00:00
TAMAÑO: 2.309934 MB
ls -lt | head -3:
```text
total 4760
-rw-------@ 1 User  staff      882 Sep 26 10:06 context.json
-rw-------@ 1 User  staff   826946 Sep 26 10:06 accessibility.json
```
FUENTE: stake
CARPETA: 7e6748d28143cde1a48885cc3c2937550cc59476d7d7f5445643ee30d826b5ca-2026-09-26T03-10-55-342Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:55.362305+00:00
TAMAÑO: 0.007263 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   966 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betsson
CARPETA: 7ee1eb080629fa4fab8d83b86e29c677942ee8c27f11f342edb9854080a118e2-2026-09-26T03-16-22-288Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:22.327349+00:00
TAMAÑO: 0.007465 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1178 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: oddschecker
CARPETA: 7eedec1d0675c665f25277f6be809683390ff897ba7d8d6c16c590fb5a0122b9-2026-09-26T03-03-28-514Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:28.547280+00:00
TAMAÑO: 0.007260 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   963 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: betsson
CARPETA: 80209214377f6fed94a0af8578cfeec422c75a1c120a1f1815576bfa06e6c58c-2026-09-26T03-10-59-035Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:59.056153+00:00
TAMAÑO: 0.007305 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1010 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: 99bet
CARPETA: 816555697c5c1544ea00bb92d2340cf0ca90b13146f2893808e221fd741ef6a2-2026-09-26T03-08-15-491Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:15.520636+00:00
TAMAÑO: 0.007197 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   897 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: betus
CARPETA: 81bc8ab416bd3456490962bab6c7be61237dd348bb0f4328ed2d62046cd57dcd-2026-09-26T03-07-19-022Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:19.041996+00:00
TAMAÑO: 0.007252 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   954 Sep 26 10:07 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:07 accessibility.json
```
FUENTE: oddschecker
CARPETA: 81ef18645660ff6e5b57165bafe58211320cb229a4bbd8819b4a6b2b5cf9e2cc-2026-09-26T03-10-51-629Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:51.666266+00:00
TAMAÑO: 0.007277 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   981 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betfair
CARPETA: 82036f73cb7997b9792878b0dea6ff89e8ab9b7d94d6057da29a2e6616f39998-2026-09-26T03-13-00-169Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:00.188214+00:00
TAMAÑO: 0.007305 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1010 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: betonline
CARPETA: 83f6b944d25e033eb8d72523e2a74a373be91ad5fd01f14e3c0f9f58bdc88b80-2026-09-26T03-08-45-839Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:45.859557+00:00
TAMAÑO: 0.007347 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1054 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: stake
CARPETA: 85bcd457e554f5bb558fb8aa9f8901eea8464070a2f7b6a86a75f1573b53e766-2026-09-26T03-20-34-518Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:34.541148+00:00
TAMAÑO: 0.007229 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   930 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: stake
CARPETA: 85c853daf52a48bfea6a3ad743e6048be7eebf0c67f41aba07d27d113b96718e-2026-09-26T03-18-36-504Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:36.538311+00:00
TAMAÑO: 0.007315 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1020 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: ph
CARPETA: 868f2270493dccc7d9922aab54a02884a89ebbbf45955b26d037cc059cd0f7bc-2026-09-26T03-19-58-614Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:58.650012+00:00
TAMAÑO: 0.007232 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   933 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: sportsbet
CARPETA: 8739eb5b79692b6f57ad1e6a9a87ac176984a6f988ce938080facf6a3f402253-2026-09-26T03-19-43-366Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:43.404150+00:00
TAMAÑO: 0.007287 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   991 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: stake
CARPETA: 883edf243518bcd944d976c5cfc56879b8caea61d7bc82d5bd8b9e44321b6a1e-2026-09-26T03-09-44-948Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:44.969003+00:00
TAMAÑO: 0.007272 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   975 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: stake
CARPETA: 88e9465401411ccfcef42e746416dce7e7effbad35648bf1d44a3a90e623c201-2026-09-26T03-14-13-776Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:13.809484+00:00
TAMAÑO: 0.007255 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   957 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: marathonbet
CARPETA: 8aeacaed72374c7e88c990fb7196898cbd73bdefc85a09f42c0e5f83c8f125cf-2026-09-26T03-23-01-005Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:01.129246+00:00
TAMAÑO: 1.888781 MB
ls -lt | head -3:
```text
total 3888
-rw-------@ 1 User  staff      857 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  1394894 Sep 26 10:23 accessibility.json
```
FUENTE: oddschecker
CARPETA: 8d4b47de2d9b45f0d34a8379cba259b7400a7612587fb77c5886c4db9b0bf9f2-2026-09-26T03-22-43-029Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:43.082419+00:00
TAMAÑO: 0.007235 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   936 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:22 accessibility.json
```
FUENTE: sportsbet
CARPETA: 8d9ecc4ce3b0b2f2fd56a2833d98c6eb75717a35ba7ca919cab2f221fd3f634b-2026-09-26T03-05-30-091Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:30.126255+00:00
TAMAÑO: 0.007304 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1009 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: tabnz
CARPETA: 8e711b9c0d8a4b5d10173fcd49a9ac078fa169e2ca508aee7dcff05a89a1f234-2026-09-30T04-25-18-798Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:25:20.521380+00:00
TAMAÑO: 0.997520 MB
ls -lt | head -3:
```text
total 2064
-rw-------@ 1 User  staff     673 Sep 30 11:25 context.json
-rw-------@ 1 User  staff  243360 Sep 30 11:25 accessibility.json
```
FUENTE: stake
CARPETA: 8f56db392790f5a5d1b69f4753c486d0ebefb4ab0e5fe28883265e61adccffde-2026-09-26T03-12-40-897Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:40.919970+00:00
TAMAÑO: 0.007226 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   927 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: betfair
CARPETA: 90b0ddc3a8a024c23039ab729144ae208c17d683e90c3215ed0aaf9057a17ab0-2026-09-26T03-11-48-053Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:48.082546+00:00
TAMAÑO: 0.007334 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1040 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: oddschecker
CARPETA: 91407339f170f4aaff268f87c16ebf623ac25849c57232c7d5afcee9e24619f1-2026-09-26T03-05-04-029Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:04.081437+00:00
TAMAÑO: 0.007280 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   984 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: oddshub
CARPETA: 9140e2830704761f5e7fc896d8103755b9af6edb78efd821f6c4b3521e844c45-2026-09-26T03-24-05-927Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:24:06.097002+00:00
TAMAÑO: 1.092224 MB
ls -lt | head -3:
```text
total 2256
-rw-------@ 1 User  staff     777 Sep 26 10:24 context.json
-rw-------@ 1 User  staff  650059 Sep 26 10:24 accessibility.json
```
FUENTE: oddsportal
CARPETA: 9147ff35bf587c638adff7320c58abfa665b6cef38c62b88162bc95c6a663c6e-2026-09-26T03-04-43-096Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:43.135148+00:00
TAMAÑO: 0.007228 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   929 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: betonline
CARPETA: 91867e9ce3da6206362fa27c196d5ba98f78bb7861674cad18f5a928825460ed-2026-09-26T03-08-57-465Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:57.509241+00:00
TAMAÑO: 0.007270 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   973 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: sportsbet
CARPETA: 93e4547c62d4fdb5241314a311fc2b15c97a8176a8303e49af6f879543bc91ca-2026-09-26T03-15-12-390Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:12.430139+00:00
TAMAÑO: 0.118903 MB
ls -lt | head -3:
```text
total 264
-rw-------@ 1 User  staff    838 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  73455 Sep 26 10:15 accessibility.json
```
FUENTE: stake
CARPETA: 964250df1a8ccf0b751b0e04346af9c0946c59968461dbbabe1e78524129c288-2026-09-26T03-10-09-487Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:09.505316+00:00
TAMAÑO: 0.007386 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1095 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: oddsportal
CARPETA: 97033c508b1812d8c11f3d1b113f84cf0783c7c87720ec1f891187390d922128-2026-09-26T03-14-10-092Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:10.126533+00:00
TAMAÑO: 0.007254 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   956 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: ph
CARPETA: 972b02ea6d1edbadadfbca16e0fbf8c7285ad5be38665772722653a1ada80d03-2026-09-26T03-21-44-424Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:44.461261+00:00
TAMAÑO: 0.007195 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   894 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: oddsportal
CARPETA: 979be06d3b272b1eb76637f04b8205cdeaf5cacce5e66994e2ec48f19eca7fb6-2026-09-26T03-02-50-819Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:50.853512+00:00
TAMAÑO: 0.007236 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   938 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: betfair
CARPETA: 98441d73fe496b1b14485ee648ad9a050a7994d10d9dde19bf59f413a3f9a312-2026-09-26T03-03-01-939Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:01.976148+00:00
TAMAÑO: 0.007299 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1004 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: sportsbet
CARPETA: 98db901900f4aadf5957ac2e771e3b174289ee4a9184d6fd1e495ea29e3825d2-2026-09-26T03-02-39-839Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:39.868415+00:00
TAMAÑO: 0.007267 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   970 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: reidopitaco
CARPETA: 994fbd629c79076afa2d234049c271058c26c45b4fd55420303e380b5f6a66e1-2026-09-28T06-34-45-437Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-28T06:34:45.475465+00:00
TAMAÑO: 0.021911 MB
ls -lt | head -3:
```text
total 80
-rw-------@ 1 User  staff    795 Sep 28 13:34 context.json
-rw-------@ 1 User  staff   9588 Sep 28 13:34 accessibility.json
```
FUENTE: actionnetwork
CARPETA: 9962006fc489b91dce63a7ac06b41467d3e418cad5154fe71009e5aae45df46a-2026-09-26T03-04-30-691Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:31.624801+00:00
TAMAÑO: 8.394488 MB
ls -lt | head -3:
```text
total 17216
-rw-------@ 1 User  staff      850 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  3808299 Sep 26 10:04 accessibility.json
```
FUENTE: betonline
CARPETA: 9ac5294152e6c56e8eb1813710b92e6d4af9dcdadd83550f1303e9df7a1e8bba-2026-09-26T03-08-30-764Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:30.803997+00:00
TAMAÑO: 0.007293 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   997 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: stake
CARPETA: 9b0ad345c86fa4cc9a32cbcba6b7237194a60e4e683c21a6ef45bfa6bed94c49-2026-09-26T03-10-22-043Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:22.078608+00:00
TAMAÑO: 0.007300 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1005 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betfair
CARPETA: 9b6f88c32143d3b05e96c0fa8d8b1c6b0e45abdc56e7ea54e26ebea6120c1880-2026-09-26T03-04-52-998Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:53.051571+00:00
TAMAÑO: 0.007354 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1061 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: betfair
CARPETA: 9b8ea49a8b5a503990e799260b45a52f617da6dd9c0058de74adfec39fd5eb47-2026-09-26T03-04-07-334Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:07.353683+00:00
TAMAÑO: 0.007319 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1025 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: codere
CARPETA: 9bf0691c2194341d046a1a63bd9a9350002ea015cc8e84db1a4bce871fa4f66c-2026-09-27T10-27-02-139Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:27:02.757606+00:00
TAMAÑO: 1.398438 MB
ls -lt | head -3:
```text
total 2888
-rw-------@ 1 User  staff     805 Sep 27 17:27 context.json
-rw-------@ 1 User  staff  685937 Sep 27 17:27 accessibility.json
```
FUENTE: oddspedia
CARPETA: 9c454381bd2e5130512a9ea31a3e9f967929f1b345ad9007a26feb2ca1b5717e-2026-09-26T03-12-03-301Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:03.337306+00:00
TAMAÑO: 0.007241 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   943 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: betfair
CARPETA: 9c591d7178b009bf23157b50373f27a687ef5599ef350c1f67c42250fd533ff0-2026-09-26T03-13-48-734Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:48.770463+00:00
TAMAÑO: 0.007291 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   995 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: stake
CARPETA: 9c886012537c4974124d196487370af9c86b2776b962c6289d7d233a86753df5-2026-09-26T03-18-02-669Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:02.710611+00:00
TAMAÑO: 0.007292 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   996 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: oddsportal
CARPETA: 9cc19a9ea1bc4780120f4af5e4b345677f7748f276e1ae38b34a9227cf89a2b2-2026-09-26T03-15-34-780Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:34.821441+00:00
TAMAÑO: 0.007248 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   950 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: stake
CARPETA: 9e5a67bd2fe364041b831634070f438473f4f8dd085cc8a15aaa650bc3c496fb-2026-09-26T03-10-47-944Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:47.979878+00:00
TAMAÑO: 0.007338 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1044 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betfair
CARPETA: 9e656fc775f266b511cf4202e967edd01a5a847ceff9002ab418c31312f3402f-2026-09-26T03-15-53-612Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:53.645538+00:00
TAMAÑO: 0.007317 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1022 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: sportsbet
CARPETA: 9ed7ef8b5eceac677bb4406bfcc44f07ac7b3f3f079785e15bdad544748dae10-2026-09-26T03-09-22-711Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:22.749624+00:00
TAMAÑO: 0.007264 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   967 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: sportsbet
CARPETA: a00258337040aaa942c6610764b437a767a9ca817f6a42fa9dc99e14d287e424-2026-09-26T03-19-47-023Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:47.043436+00:00
TAMAÑO: 0.007256 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   958 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: betsson
CARPETA: a103abea5cd1667e4d3d99ef9f2b2455e41c9a955027419b839a5e9704ce73de-2026-09-26T03-10-05-684Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:05.705001+00:00
TAMAÑO: 0.007294 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   998 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: betfair
CARPETA: a10991a8f59fad1f8ea7a804c34826d34ff9ff2e1dc8a39ce65e12c68274b22f-2026-09-26T03-18-44-181Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:44.216813+00:00
TAMAÑO: 0.007317 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1022 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: stake
CARPETA: a1643c20992465c63b5927bbb3f25ef4c4d3daf414bb2301903dea16c8479ab1-2026-09-26T03-18-21-789Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:21.809773+00:00
TAMAÑO: 0.007323 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1029 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: sportsbet
CARPETA: a2ef95a098e8751a3a99156e3fc148f855c7c1449d5c4e94f87d9f05879ed02c-2026-09-26T03-11-44-298Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:44.337201+00:00
TAMAÑO: 0.007284 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   988 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: betfair
CARPETA: a510ad398a412a6979959d07da6bd4de413d1aa9140aea1a10755f2c4f5789bd-2026-09-26T03-04-39-321Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:39.365214+00:00
TAMAÑO: 0.007339 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1046 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: betsson
CARPETA: a5a85b86e889a5b32705f362b1cf1e11c9ad390869bb52727864560e8c218898-2026-09-26T03-11-17-579Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:17.613478+00:00
TAMAÑO: 0.007374 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1082 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: betsson
CARPETA: a5f0f3b706981355b075d6bcc05746f05ddd9255dd797610bb58f0d46669e86d-2026-09-26T03-16-25-973Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:26.003988+00:00
TAMAÑO: 0.007282 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   986 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: betfair
CARPETA: a6978eb40d3f70152ca7521c79e48dd85056a7c1e11c3e3945bc25a61e56fb0a-2026-09-26T03-03-52-055Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:52.093218+00:00
TAMAÑO: 0.007314 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1019 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: puntersedge
CARPETA: a6a2a048c4ebf94a022b7c58f9e758999b54e67649635a51dce2ecd89610eeb6-2026-09-26T03-19-30-959Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:31.183607+00:00
TAMAÑO: 1.863667 MB
ls -lt | head -3:
```text
total 3840
-rw-------@ 1 User  staff      840 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  1136639 Sep 26 10:19 accessibility.json
```
FUENTE: xbet
CARPETA: a7405401de228085e7f96c9cec643a46fc3aabfdcad272f42eb6e3bde2a19907-2026-09-26T03-08-38-155Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:38.178752+00:00
TAMAÑO: 0.007251 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   953 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: stake
CARPETA: a8e56b90ab993909969807889e82fb728b6ff3f342514cc185fb77242fa581d2-2026-09-26T03-18-32-813Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:32.845740+00:00
TAMAÑO: 0.007318 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1023 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: betcris
CARPETA: ab97cf9df669e702c49fcd48fae24f06a30b18a2694bc8eb9371335719c6375b-2026-09-27T10-25-41-819Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:25:42.094086+00:00
TAMAÑO: 1.593389 MB
ls -lt | head -3:
```text
total 3288
-rw-------@ 1 User  staff      787 Sep 27 17:25 context.json
-rw-------@ 1 User  staff   331937 Sep 27 17:25 accessibility.json
```
FUENTE: stake
CARPETA: ac1198f3a74085454b75a07c9b04768fa1719ba423477e0fec6d4b6a474b5b48-2026-09-26T03-08-34-475Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:34.512103+00:00
TAMAÑO: 0.007232 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   933 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: racehub
CARPETA: ae2063e1f3ee7ee1612b1fe78551048c85ab00769519dfe6cdf861e5c5c86a67-2026-09-26T03-19-16-987Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:17.300160+00:00
TAMAÑO: 4.551195 MB
ls -lt | head -3:
```text
total 9344
-rw-------@ 1 User  staff      780 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  3365275 Sep 26 10:19 accessibility.json
```
FUENTE: stake
CARPETA: af9ab968934cdf63c1cf5f1b3c8901aae66402aa5f6e927878b8b48884ac0181-2026-09-26T03-16-29-685Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:29.718894+00:00
TAMAÑO: 0.007229 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   930 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: betsson
CARPETA: afaeddde3f82f158e1b944ea2c776852da792e49079c93fff0da4d918446c66c-2026-09-26T03-09-30-224Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:30.265571+00:00
TAMAÑO: 0.007328 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1034 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: fightodds
CARPETA: b13c09fa8925043c1f1097f2ec1f118dbda319b3a8a89c021795370c3341fe55-2026-09-26T03-36-39-126Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:36:39.177577+00:00
TAMAÑO: 0.048464 MB
ls -lt | head -3:
```text
total 128
-rw-------@ 1 User  staff    774 Sep 26 10:36 context.json
-rw-------@ 1 User  staff  25009 Sep 26 10:36 accessibility.json
```
FUENTE: kto
CARPETA: b1cfc340cc8059ad5d32adccbcc1199446c0d587fc07de81fe36c7bc66cc9831-2026-09-28T04-29-49-174Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-28T04:29:49.296976+00:00
TAMAÑO: 0.974277 MB
ls -lt | head -3:
```text
total 2016
-rw-------@ 1 User  staff     729 Sep 28 11:29 context.json
-rw-------@ 1 User  staff  353015 Sep 28 11:29 accessibility.json
```
FUENTE: kto
CARPETA: b1cfc340cc8059ad5d32adccbcc1199446c0d587fc07de81fe36c7bc66cc9831-2026-09-28T06-34-28-871Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-28T06:34:28.980022+00:00
TAMAÑO: 0.936781 MB
ls -lt | head -3:
```text
total 1944
-rw-------@ 1 User  staff     955 Sep 28 13:34 context.json
-rw-------@ 1 User  staff  353016 Sep 28 13:34 accessibility.json
```
FUENTE: stake
CARPETA: b2f4592092354bf7ddae5cfb05ce0926d48e3df157023faf45f68f31cd8aa6bf-2026-09-26T03-18-10-155Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:10.185728+00:00
TAMAÑO: 0.007295 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   999 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: stake
CARPETA: b47c90c6cae8f474817e704586844e8f8cb4b1daa202d36b17978afed95ad78b-2026-09-26T03-07-22-928Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:22.966908+00:00
TAMAÑO: 0.007260 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   963 Sep 26 10:07 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:07 accessibility.json
```
FUENTE: ladbrokes
CARPETA: b49458e2ab75c944680636a4490a36834c089b585bf0c5629d6b14f1e760fef0-2026-09-26T03-12-48-772Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:48.792869+00:00
TAMAÑO: 0.007270 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   973 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: oddsportal
CARPETA: b59cb4655fee3a035f5c0de812552c818674cfc1857053afbbbc89cf4920964b-2026-09-26T03-20-17-791Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:17.829322+00:00
TAMAÑO: 0.007282 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   986 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: betway
CARPETA: b5ece4c11ec5e68ff83a907c84a9740d2c96b840566b7cb1f91d9f2a76866725-2026-09-27T10-25-17-085Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:25:17.211665+00:00
TAMAÑO: 2.631244 MB
ls -lt | head -3:
```text
total 5400
-rw-------@ 1 User  staff      803 Sep 27 17:25 context.json
-rw-------@ 1 User  staff  1576725 Sep 27 17:25 accessibility.json
```
FUENTE: betsson
CARPETA: b5fea386f1b2f2f3af3534bd2bd86fac5e3fa9de0daba8c37bf20f1ca0baa4b1-2026-09-26T03-12-10-786Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:10.820217+00:00
TAMAÑO: 0.007271 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   974 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: betsson
CARPETA: b7c6e223ff6a77e7eb4a42ccca70936fdd1c7941da4563da14fb6033b0225f11-2026-09-26T03-18-06-425Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:06.460337+00:00
TAMAÑO: 0.007380 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1088 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: oddsportal
CARPETA: b9a56699216a0c1ec12c937498f85a663c397b0eb657cd4b1f90d9abfa2358f4-2026-09-26T03-04-18-660Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:18.680830+00:00
TAMAÑO: 0.007268 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   971 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: sportsbet
CARPETA: bb15f8ff66ed59345d7612f0e5deb21fdffb436c0363237c1134978394df1429-2026-09-30T04-28-58-377Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:28:58.517335+00:00
TAMAÑO: 1.692704 MB
ls -lt | head -3:
```text
total 3488
-rw-------@ 1 User  staff      833 Sep 30 11:28 context.json
-rw-------@ 1 User  staff   312627 Sep 30 11:28 accessibility.json
```
FUENTE: oddschecker
CARPETA: bc8f3e996fbd67ca0cc0148f02ca4cc3383ce5b5ddcf4a8db715f4215d1629c2-2026-09-26T03-10-30-277Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:30.312168+00:00
TAMAÑO: 0.007295 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   999 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: oddshub
CARPETA: bcc4543abc75e05652806c6d3ee88c41d2ab84c22a26e226be0d762baaa569ef-2026-09-26T03-23-37-731Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:37.909308+00:00
TAMAÑO: 1.086366 MB
ls -lt | head -3:
```text
total 2248
-rw-------@ 1 User  staff     759 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  649418 Sep 26 10:23 accessibility.json
```
FUENTE: oddschecker
CARPETA: bcd02d8a7602356551dc599c49152030debc55aee37113a15d2968f886d76cb5-2026-09-26T03-09-26-374Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:26.428366+00:00
TAMAÑO: 0.007269 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   972 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: winpot
CARPETA: bd0e54f498bdc239060168553dbd137d6490c1f9e880159f5bf6ddb36069e3a3-2026-09-27T10-07-30-426Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:07:30.844591+00:00
TAMAÑO: 2.378361 MB
ls -lt | head -3:
```text
total 4896
-rw-------@ 1 User  staff      808 Sep 27 17:07 context.json
-rw-------@ 1 User  staff   522762 Sep 27 17:07 accessibility.json
```
FUENTE: oddspedia
CARPETA: bd7ceed9be71b211720983de2dcbbcd983ec257914be2f0ea8539b048b62f971-2026-09-26T03-15-38-440Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:38.493541+00:00
TAMAÑO: 0.007230 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   931 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: betfair
CARPETA: be0ea1c2de16afda58900690b41f477c2531ffed19b6eaab2c1d8d4901850e98-2026-09-26T03-13-17-824Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:17.860320+00:00
TAMAÑO: 0.007236 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   938 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: betway
CARPETA: bed9900eb3383ce6fb61b25a84b95ad6f009b6e96f8aabb7c51269f34dcb5951-2026-09-27T10-27-12-922Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:27:13.126336+00:00
TAMAÑO: 2.631145 MB
ls -lt | head -3:
```text
total 5408
-rw-------@ 1 User  staff      808 Sep 27 17:27 context.json
-rw-------@ 1 User  staff  1577234 Sep 27 17:27 accessibility.json
```
FUENTE: betsson-home-diagnostic-1790415699508
ARCHIVOS: 4
ÚLTIMO: 2026-09-26T09:42:06.168475+00:00
TAMAÑO: 0.150459 MB
ls -lt | head -3:
```text
total 320
-rw-r--r--@ 1 User  staff    3907 Sep 26 16:42 context.json
-rw-r--r--@ 1 User  staff   12942 Sep 26 16:42 network-full.json
```
FUENTE: betsson-mx-sports-diagnostic-1790415996762
ARCHIVOS: 4
ÚLTIMO: 2026-09-26T09:47:02.331797+00:00
TAMAÑO: 12.072542 MB
ls -lt | head -3:
```text
total 24736
-rw-r--r--@ 1 User  staff     15404 Sep 26 16:47 context.json
-rw-r--r--@ 1 User  staff  11897091 Sep 26 16:47 network-full.json
```
FUENTE: betsson-retry-browser-1790415949115
ARCHIVOS: 4
ÚLTIMO: 2026-09-26T09:46:15.167659+00:00
TAMAÑO: 6.143801 MB
ls -lt | head -3:
```text
total 12600
-rw-r--r--@ 1 User  staff    23456 Sep 26 16:46 context.json
-rw-r--r--@ 1 User  staff  3621229 Sep 26 16:46 network-full.json
```
FUENTE: stake
CARPETA: bf6ae8c4e01f74ccb5705af70aa62a29d5360ae7fcb6692a0e757da11d7162a8-2026-09-26T03-08-19-166Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:19.193474+00:00
TAMAÑO: 0.007272 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   975 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:08 accessibility.json
```
FUENTE: oddschecker
CARPETA: c17d208351c4dd4c8fb469a527574fc73e7597304c646d5c4de03569b306ca91-2026-09-26T03-04-14-828Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:04:14.867040+00:00
TAMAÑO: 0.007260 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   963 Sep 26 10:04 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:04 accessibility.json
```
FUENTE: stake
CARPETA: c1842e29a53b5fb979e787e912e7ec8855824f675346f4b32653dc7aa4296a96-2026-09-26T03-21-18-185Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:18.209245+00:00
TAMAÑO: 0.007232 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   933 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: actionnetwork
CARPETA: c209b9be2669d6fdff602260c035e08b2afa80d4788ee628762cb87da5bdf7a0-2026-09-26T03-03-16-604Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:17.308157+00:00
TAMAÑO: 4.832025 MB
ls -lt | head -3:
```text
total 9920
-rw-------@ 1 User  staff      834 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  1354333 Sep 26 10:03 accessibility.json
```
FUENTE: actionnetwork
CARPETA: c2b95527448fbd6c8a8be2856879d737d4b8e1498d87b1eb5cadcf7809c3e7cc-2026-09-26T03-02-35-420Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:35.988051+00:00
TAMAÑO: 5.685889 MB
ls -lt | head -3:
```text
total 11664
-rw-------@ 1 User  staff      828 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2623347 Sep 26 10:02 accessibility.json
```
FUENTE: oddschecker
CARPETA: c40a5e59c822a5bc6d96b9cf6d867b02f57ac3a625316a117d3c2cb72fa0364d-2026-09-26T03-10-18-301Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:18.335922+00:00
TAMAÑO: 0.007269 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   972 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: oddsportal
CARPETA: c4634c095ae39ef2fc07701da8d4556fd4c096a371543c2936342c3d062a5db4-2026-09-26T03-03-32-275Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:32.323944+00:00
TAMAÑO: 0.007242 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   944 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: stake
CARPETA: c56b9a2a5b9aad04c0dd37dca1049dcdf222fa1d0d47b258f09242705e8aa973-2026-09-26T03-20-41-979Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:42.014879+00:00
TAMAÑO: 0.007237 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   939 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: bestfightodds
CARPETA: c587a50a49218e2a2acb732ad2b729f5e38e33c62a841b6a1e4ba121f380b009-2026-09-25T11-19-38-646Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-25T11:19:39.255220+00:00
TAMAÑO: 26.746204 MB
ls -lt | head -3:
```text
total 54808
-rw-------@ 1 User  staff       892 Sep 25 18:19 context.json
-rw-------@ 1 User  staff  24232559 Sep 25 18:19 accessibility.json
```
FUENTE: sportsbet
CARPETA: c67ce860bf3738fc9243a4eda40cf548790e971c5f45b4c77701c8b493b075bd-2026-09-26T03-03-24-804Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:24.824850+00:00
TAMAÑO: 0.007307 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1012 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: betfair
CARPETA: c6dc8357b5103b0151d8c99357e6bdf778bf3f6d5f02dc89554586dfc0a6d571-2026-09-26T03-05-18-846Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:18.883669+00:00
TAMAÑO: 0.007299 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1004 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: betsson
CARPETA: c9acc7dd511637519b24cbcac5dbb51b68857dae9041a43fe396b709a18a1a85-2026-09-26T03-14-58-562Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:58.599191+00:00
TAMAÑO: 0.007291 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   995 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: stake
CARPETA: ca4c6b9954c12fb6bdaa8c99a54fdc5b970a4a11780fc315a996c407f6da667d-2026-09-26T03-18-18-070Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:18.114278+00:00
TAMAÑO: 0.007298 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1002 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: oddsportal
CARPETA: ca651bb05c322a42eee99f09b98463a161c17350e7cf06a1cf56cd49e181f843-2026-09-26T03-11-59-540Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:59.595405+00:00
TAMAÑO: 0.007245 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   947 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: oddspedia
CARPETA: cacd4f78c27c5e39d9178a3ca9b42562a1e53589da2e265f3cbfea9ed90a5ad4-2026-09-26T03-11-36-596Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:36.620617+00:00
TAMAÑO: 0.007250 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   952 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: betus
CARPETA: cc4c41e7494108dc9261ef650fb530650b8bddc6225287c992a46ca15b6a18b5-2026-09-26T03-14-21-112Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:21.149579+00:00
TAMAÑO: 0.007289 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   993 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: betus
CARPETA: cc6d47ddedaa1d6d226d80eb964a2c9de1898037945ff53e76117828cee68502-2026-09-26T03-13-45-018Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:45.054968+00:00
TAMAÑO: 0.007275 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   978 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: betmotion
CARPETA: cf8a44fd076b43321d8a2bd28b6ac027df84da4ea25895fb70eb0c6ac5303cf3-2026-09-28T06-34-51-448Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-28T06:34:51.501506+00:00
TAMAÑO: 0.238116 MB
ls -lt | head -3:
```text
total 512
-rw-------@ 1 User  staff     962 Sep 28 13:34 context.json
-rw-------@ 1 User  staff   29505 Sep 28 13:34 accessibility.json
```
FUENTE: stake
CARPETA: cf9d5872fb4720c6cb1247aed113f7ae156249d9a6be0a453f3c21cbd7f6befa-2026-09-26T03-20-23-456Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:23.490510+00:00
TAMAÑO: 0.007223 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   924 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: stake
CARPETA: d4ca20db792ce9294bb28a4b0c1f2ae930c24b345a88b968bc67735d3f83191c-2026-09-26T03-23-04-793Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:04.817581+00:00
TAMAÑO: 0.007232 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   933 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:23 accessibility.json
```
FUENTE: oddsportal
CARPETA: d55e34c4cc152828b357a520a7b0052a51edcd2aa1362f7fc02a8a7a991b5b52-2026-09-26T03-12-33-572Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:33.594407+00:00
TAMAÑO: 0.007239 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   941 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: stake
CARPETA: d767a2dd678d90ec45250b57f1bd376d4d916b0ca419d126d652e1409cae449a-2026-09-26T03-17-55-366Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:17:55.392138+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:17 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:17 accessibility.json
```
FUENTE: sportsbet
CARPETA: d7ca3db2e1953fa40104a3eea27d35549ca126fe9eb95e69138a4b6723900ad7-2026-09-26T03-09-01-272Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:01.309306+00:00
TAMAÑO: 0.007313 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1018 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: stake
CARPETA: d8580484b6b114ec379be561ccea3cd9e55f2bc8aa5e7918eb66facbe677ce16-2026-09-26T03-11-25-246Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:25.266747+00:00
TAMAÑO: 0.007283 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   987 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: stake
CARPETA: d8fa4530b8b75a4a122e727ba6a3149061c3ab1fa983fc091139592f1c0682d0-2026-09-26T03-16-11-209Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:11.246246+00:00
TAMAÑO: 0.007255 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   957 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: tabnz
CARPETA: da753f119105a1ee3ba97d1d6e8b88ee8b1781feaa2e1783c1b01c9ae672f968-2026-09-30T04-22-18-810Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T04:22:20.872252+00:00
TAMAÑO: 0.831172 MB
ls -lt | head -3:
```text
total 1720
-rw-------@ 1 User  staff     679 Sep 30 11:22 context.json
-rw-------@ 1 User  staff  298708 Sep 30 11:22 accessibility.json
```
FUENTE: oddsportal
CARPETA: dab2f3f4a80cc4b9a0ad7d24915e4fa80ab9718e9b09dbe039a56a9a95839660-2026-09-26T03-14-24-812Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:24.830529+00:00
TAMAÑO: 0.007299 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1004 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: marathonbet
CARPETA: dba58aa9da1b9a71af1e19a587a742c054bfbbe31ce33466ba9e9bf095f5e467-2026-09-26T03-09-57-830Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:57.954205+00:00
TAMAÑO: 1.262170 MB
ls -lt | head -3:
```text
total 2608
-rw-------@ 1 User  staff     900 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  815106 Sep 26 10:09 accessibility.json
```
FUENTE: winpot
CARPETA: ddefcf4e000bf0fe0bd6b6a0acbb24daddb7bacd68c0269e431fc82e8d0fac03-2026-09-27T10-09-44-756Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:09:45.621172+00:00
TAMAÑO: 0.484751 MB
ls -lt | head -3:
```text
total 1016
-rw-------@ 1 User  staff     848 Sep 27 17:09 context.json
-rw-------@ 1 User  staff   11857 Sep 27 17:09 accessibility.json
```
FUENTE: rushbet
CARPETA: deb337091c01bf893f28a523c97b68ce56403f2658f82f40a876485615611322-2026-09-27T10-25-14-461Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:25:15.010072+00:00
TAMAÑO: 3.470178 MB
ls -lt | head -3:
```text
total 7136
-rw-------@ 1 User  staff      820 Sep 27 17:25 context.json
-rw-------@ 1 User  staff  1048644 Sep 27 17:25 accessibility.json
```
FUENTE: oddsportal
CARPETA: dee5fb11e7f48c544ee304bcdddace445e988fead8ac810d2ec9823d427524cb-2026-09-26T03-21-25-475Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:25.510150+00:00
TAMAÑO: 0.007268 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   971 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: top99
CARPETA: df05fb1160ebd07eee1aef3373f657bcbf48e5696d3a2e800d3b3d7c37016419-2026-09-26T03-07-07-391Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:07.473790+00:00
TAMAÑO: 0.184786 MB
ls -lt | head -3:
```text
total 400
-rw-------@ 1 User  staff     840 Sep 26 10:07 context.json
-rw-------@ 1 User  staff   79571 Sep 26 10:07 accessibility.json
```
FUENTE: oddschecker
CARPETA: df696e07815b4e25f73173cc0f4519462ab607619bd198382c0c5920fa1aba81-2026-09-26T03-02-47-165Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:47.203228+00:00
TAMAÑO: 0.007243 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   945 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: 10cric
CARPETA: df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-2026-09-30T03-17-48-376Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T03:17:48.480305+00:00
TAMAÑO: 0.122087 MB
ls -lt | head -3:
```text
total 280
-rw-------@ 1 User  staff    755 Sep 30 10:17 context.json
-rw-------@ 1 User  staff  42756 Sep 30 10:17 accessibility.json
```
FUENTE: 10cric
CARPETA: df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-2026-09-30T03-36-09-045Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T03:36:09.509220+00:00
TAMAÑO: 4.354364 MB
ls -lt | head -3:
```text
total 8944
-rw-------@ 1 User  staff      693 Sep 30 10:36 context.json
-rw-------@ 1 User  staff  1503734 Sep 30 10:36 accessibility.json
```
FUENTE: 10cric
CARPETA: df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-2026-09-30T03-37-20-210Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-30T03:37:20.772682+00:00
TAMAÑO: 7.413873 MB
ls -lt | head -3:
```text
total 15200
-rw-------@ 1 User  staff      703 Sep 30 10:37 context.json
-rw-------@ 1 User  staff  1758137 Sep 30 10:37 accessibility.json
```
FUENTE: betsson
CARPETA: dffa1527ed28a2f6f1cec5dcac265083eb28c5091fe7a948c784dc2faf396aa9-2026-09-26T03-15-45-858Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:45.911491+00:00
TAMAÑO: 0.007279 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   983 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: betfair
CARPETA: e124573519c6c9fb07aa7b3305413d8a5504cd8c0a3666c24ec423c6c1bff38a-2026-09-26T03-05-33-721Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:05:33.744045+00:00
TAMAÑO: 0.007302 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1007 Sep 26 10:05 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:05 accessibility.json
```
FUENTE: betcris
CARPETA: e1ddda1182dfda89c091d8b2fd193722fa1352311bb695aff0286f4bbd8b612c-2026-09-27T10-25-11-516Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:25:12.040551+00:00
TAMAÑO: 0.748486 MB
ls -lt | head -3:
```text
total 1552
-rw-------@ 1 User  staff     710 Sep 27 17:25 context.json
-rw-------@ 1 User  staff  386626 Sep 27 17:25 accessibility.json
```
FUENTE: betfair
CARPETA: e26530a745125ade0ce0bc3ddd8744ef9bdefc282e4276f7f353e1fb5404ffc2-2026-09-26T03-12-44-976Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:45.028160+00:00
TAMAÑO: 0.007294 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   998 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: stake
CARPETA: e297b49473d7ea6ac5bb769eeed546800f03e6824409fdfc573c67ca7d9285c9-2026-09-26T03-15-27-427Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:27.461272+00:00
TAMAÑO: 0.007232 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   933 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: stake
CARPETA: e2f06100ff214989d39edc920b59a9095b9347f1dd27a9b8c134ec7a24c0607c-2026-09-26T03-18-14-072Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:18:14.094038+00:00
TAMAÑO: 0.007355 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1062 Sep 26 10:18 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:18 accessibility.json
```
FUENTE: oddshub
CARPETA: e31e8e9e55cb58f72db2db292976372682bf261524b8a39ddc1c20aa387b5234-2026-09-26T03-22-31-502Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:31.670639+00:00
TAMAÑO: 1.086796 MB
ls -lt | head -3:
```text
total 2248
-rw-------@ 1 User  staff     756 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  649600 Sep 26 10:22 accessibility.json
```
FUENTE: oddschecker
CARPETA: e3d07e41f642e3dda043f124f9e090f9ab7862538a511945a9987784e50c5b2e-2026-09-26T03-09-41-327Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:41.346046+00:00
TAMAÑO: 0.007266 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   969 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: betfair
CARPETA: e45c5f60d7760b20ea18428dd20a478a0745dc8ae2b4fc46d313e91b3877a5ec-2026-09-26T03-19-35-695Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:19:35.718427+00:00
TAMAÑO: 0.007337 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1043 Sep 26 10:19 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:19 accessibility.json
```
FUENTE: oddsportal
CARPETA: e4b313998fe16400f1389324e35601a9ede13b3a82fbaead57ce0a3f67498909-2026-09-26T03-13-39-266Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:39.294688+00:00
TAMAÑO: 0.007294 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   998 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: esportsbetting
CARPETA: e4f502ec8ae7f5dcbf61666f2da279540b13b7da1957b87c1f82b5710d779ff2-2026-09-26T03-21-58-044Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:58.605393+00:00
TAMAÑO: 2.875826 MB
ls -lt | head -3:
```text
total 5920
-rw-------@ 1 User  staff      803 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  1004923 Sep 26 10:21 accessibility.json
```
FUENTE: tk791
CARPETA: e50a7fdec03aa303781c4f719f704acdf7a88c9e9592e5a0ed070e7c40274adb-2026-09-26T03-07-59-196Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:00.774979+00:00
TAMAÑO: 6.076111 MB
ls -lt | head -3:
```text
total 12472
-rw-------@ 1 User  staff      797 Sep 26 10:08 context.json
-rw-------@ 1 User  staff  1021812 Sep 26 10:08 accessibility.json
```
FUENTE: oddsportal
CARPETA: e5874129ffcd441fa17ba933f1618a1e49be926b16e942f413fef53e014d450b-2026-09-26T03-21-14-341Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:21:14.376918+00:00
TAMAÑO: 0.007279 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   983 Sep 26 10:21 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:21 accessibility.json
```
FUENTE: oddspedia
CARPETA: e5b4424364a6a35327304d61b1fefb755fe8166f42fc68e82278021dd16778b1-2026-09-26T03-02-28-147Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:02:28.170452+00:00
TAMAÑO: 0.007238 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   940 Sep 26 10:02 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:02 accessibility.json
```
FUENTE: betcris
CARPETA: e5c0b7b029a3f7cc0f194c0681980c81430b3157739f82a905711d5218d9724c-2026-09-27T10-27-25-004Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:27:26.436368+00:00
TAMAÑO: 2.323125 MB
ls -lt | head -3:
```text
total 4784
-rw-------@ 1 User  staff      762 Sep 27 17:27 context.json
-rw-------@ 1 User  staff   493290 Sep 27 17:27 accessibility.json
```
FUENTE: oddschecker
CARPETA: e8b2f28fe1bfc8783d743c57962517febcbf8da3c42b9bb810e30ae37ee07af1-2026-09-26T03-09-07-304Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:09:07.331831+00:00
TAMAÑO: 0.007309 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1014 Sep 26 10:09 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:09 accessibility.json
```
FUENTE: strikingodds
CARPETA: e8cf7c12e9d01a92c062c6b2786ab21663201e6063e78f659d9d45356aefc16b-2026-09-26T03-06-05-574Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:06:06.965839+00:00
TAMAÑO: 2.897163 MB
ls -lt | head -3:
```text
total 5952
-rw-------@ 1 User  staff      819 Sep 26 10:06 context.json
-rw-------@ 1 User  staff  1676124 Sep 26 10:06 accessibility.json
```
FUENTE: oddshub
CARPETA: e91a16b25f27250a0feb405e08dcd4bd196a136487fa1cd1e265b022aaeaa236-2026-09-26T03-23-52-095Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:23:52.269404+00:00
TAMAÑO: 1.084896 MB
ls -lt | head -3:
```text
total 2240
-rw-------@ 1 User  staff     747 Sep 26 10:23 context.json
-rw-------@ 1 User  staff  649329 Sep 26 10:23 accessibility.json
```
FUENTE: stake
CARPETA: eb770865118534edd8bb2bc9101e56593caccff0569e0f4a55d87f566ec38c5b-2026-09-26T03-13-31-691Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:13:31.728675+00:00
TAMAÑO: 0.007280 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   984 Sep 26 10:13 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:13 accessibility.json
```
FUENTE: oddspedia
CARPETA: ec1c3371a91bf58608773169979a8866ecf503acb1260b9a2920910b59fe2abd-2026-09-26T03-03-09-206Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:09.241768+00:00
TAMAÑO: 0.007244 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   946 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: oddspedia
CARPETA: ece2cce2047542ea514ed35e6416069d528e4e4a009264c3c92b8c9da5a99320-2026-09-26T03-12-14-556Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:12:14.593425+00:00
TAMAÑO: 0.007233 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   934 Sep 26 10:12 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:12 accessibility.json
```
FUENTE: ph
CARPETA: eec0edea421762864f14d19cd9e6c06753179ea32521440a830810b3eabcc7db-2026-09-26T03-20-38-219Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:38.243345+00:00
TAMAÑO: 0.007206 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   906 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: kh8
CARPETA: f055a05abded6540df3557ae7d58c4ae1a55aa41eee4c165577295915e79f1ba-2026-09-26T03-08-11-063Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:08:11.818956+00:00
TAMAÑO: 3.135659 MB
ls -lt | head -3:
```text
total 6448
-rw-------@ 1 User  staff      755 Sep 26 10:08 context.json
-rw-------@ 1 User  staff   628363 Sep 26 10:08 accessibility.json
```
FUENTE: betmgm
CARPETA: f230084055426f700c7aceb8a835b504ffc9ca9c8826e396c3ad4c58fdd727e9-2026-09-26T03-22-24-545Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:22:24.577558+00:00
TAMAÑO: 0.061240 MB
ls -lt | head -3:
```text
total 144
-rw-------@ 1 User  staff    853 Sep 26 10:22 context.json
-rw-------@ 1 User  staff  28006 Sep 26 10:22 accessibility.json
```
FUENTE: stake
CARPETA: f3a812d86bdc693d7f6fbcd788c52d47ab6f332e00e2ac4132f866d92a0f60be-2026-09-26T03-15-42-083Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:42.138177+00:00
TAMAÑO: 0.007240 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   942 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: pinnacle
CARPETA: f4ed83f2da3016da141bf0ba7c35b1eedec833a09786562564c9d4f4279a0634-2026-09-26T03-20-06-748Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:06.780590+00:00
TAMAÑO: 0.007300 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1005 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: betsson
CARPETA: f5ac50e499f65a670abcd3c74007c550d49f385fb5316e0d7bed8459a26a4790-2026-09-26T03-15-57-281Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:15:57.317992+00:00
TAMAÑO: 0.007271 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   974 Sep 26 10:15 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:15 accessibility.json
```
FUENTE: m71p
CARPETA: f60e92a856f41d1eded5172cdea77cb017c4fe2ede4c81919dc344988d635963-2026-09-26T03-07-41-728Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:07:42.711955+00:00
TAMAÑO: 4.020443 MB
ls -lt | head -3:
```text
total 8264
-rw-------@ 1 User  staff      793 Sep 26 10:07 context.json
-rw-------@ 1 User  staff   688911 Sep 26 10:07 accessibility.json
```
FUENTE: oddsportal
CARPETA: f63bef517b24bef4dfd089118d5b9c65ebf5129ba7d0b71c348b79ebfc619d89-2026-09-26T03-11-32-929Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:32.951592+00:00
TAMAÑO: 0.007254 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   956 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: stake
CARPETA: f6453849748ecdd7d7f23fe56c4c012b4289624ee5b351d8d21ee26452812a58-2026-09-26T03-16-40-934Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:40.968363+00:00
TAMAÑO: 0.007318 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff  1023 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: betano
CARPETA: f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-01-45-367Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T10:01:45.433162+00:00
TAMAÑO: 0.209107 MB
ls -lt | head -3:
```text
total 456
-rw-------@ 1 User  staff     845 Sep 26 17:01 context.json
-rw-------@ 1 User  staff   14126 Sep 26 17:01 accessibility.json
```
FUENTE: betano
CARPETA: f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-09-29-186Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T10:09:29.248762+00:00
TAMAÑO: 0.230095 MB
ls -lt | head -3:
```text
total 496
-rw-------@ 1 User  staff     818 Sep 26 17:09 context.json
-rw-------@ 1 User  staff   27593 Sep 26 17:09 accessibility.json
```
FUENTE: betano
CARPETA: f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-10-37-239Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T10:10:37.299963+00:00
TAMAÑO: 0.230123 MB
ls -lt | head -3:
```text
total 496
-rw-------@ 1 User  staff     818 Sep 26 17:10 context.json
-rw-------@ 1 User  staff   27622 Sep 26 17:10 accessibility.json
```
FUENTE: betano
CARPETA: f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-26T10-10-37-771Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T10:10:37.775205+00:00
TAMAÑO: 0.001529 MB
ls -lt | head -3:
```text
total 40
-rw-------@ 1 User  staff  1589 Sep 26 17:10 context.json
-rw-------@ 1 User  staff     4 Sep 26 17:10 accessibility.json
```
FUENTE: betano
CARPETA: f79164bee410398692d41932547f6b62eaea44df564bdf0b2a4316f0d691084e-2026-09-27T11-09-03-979Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T11:09:04.042892+00:00
TAMAÑO: 0.237388 MB
ls -lt | head -3:
```text
total 512
-rw-------@ 1 User  staff     845 Sep 27 18:09 context.json
-rw-------@ 1 User  staff   29461 Sep 27 18:09 accessibility.json
```
FUENTE: winpot
CARPETA: f7bc29ee91d7ab07bf18f71b982e60bd7a4746633068fa275e3db332b8a3881f-2026-09-27T10-09-58-874Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:09:59.741839+00:00
TAMAÑO: 0.494858 MB
ls -lt | head -3:
```text
total 1040
-rw-------@ 1 User  staff     874 Sep 27 17:09 context.json
-rw-------@ 1 User  staff   11870 Sep 27 17:09 accessibility.json
```
FUENTE: oddsportal
CARPETA: f884ff9429c594a57533d5c497b6421ca8975e6ce36c66071d1f8bebbe4a5dad-2026-09-26T03-20-49-392Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:20:49.428644+00:00
TAMAÑO: 0.007274 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   977 Sep 26 10:20 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:20 accessibility.json
```
FUENTE: betway
CARPETA: f9771afc3bf1a4f80b093b0676a387d173445efc38e07d004ee842588937318e-2026-09-27T10-25-02-153Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:25:02.195363+00:00
TAMAÑO: 0.009993 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   771 Sep 27 17:25 context.json
-rw-------@ 1 User  staff  4054 Sep 27 17:25 accessibility.json
```
FUENTE: betano
CARPETA: fa60d2e88c0d563ad0901549a8af6e1f9e71abaee10d6bef26988223ea2b716e-2026-09-26T10-02-00-443Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T10:02:00.496778+00:00
TAMAÑO: 0.211593 MB
ls -lt | head -3:
```text
total 464
-rw-------@ 1 User  staff     842 Sep 26 17:02 context.json
-rw-------@ 1 User  staff   16735 Sep 26 17:02 accessibility.json
```
FUENTE: oddspedia
CARPETA: fab67466f7eec0dd5e99b4ff6828eb13ba9a2de3fbd005250568d9a54b51f485-2026-09-26T03-03-35-980Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:03:36.022116+00:00
TAMAÑO: 0.007238 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   940 Sep 26 10:03 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:03 accessibility.json
```
FUENTE: brasildasorte
CARPETA: fafb5fde3899308d4e942292994ec8e3d4fde474e6501661634b09a3bdbbf93f-2026-09-28T04-36-15-118Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-28T04:36:15.266369+00:00
TAMAÑO: 1.717369 MB
ls -lt | head -3:
```text
total 3536
-rw-------@ 1 User  staff     841 Sep 28 11:36 context.json
-rw-------@ 1 User  staff  645529 Sep 28 11:36 accessibility.json
```
FUENTE: stake
CARPETA: fb4b4944f4dbbcf41082681a72377a41143ee194552f903444e2fabbf054efbf-2026-09-26T03-16-18-601Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:16:18.637922+00:00
TAMAÑO: 0.007295 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   999 Sep 26 10:16 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:16 accessibility.json
```
FUENTE: oddschecker
CARPETA: fc325346467ff6b17d785bca96d5facc437d45c22a0de504a80e5d71637700da-2026-09-26T03-11-06-487Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:06.505978+00:00
TAMAÑO: 0.007277 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   981 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: stake
CARPETA: fced4bfda2e7c962f7910446f91f3515cee1a1e3f8d7d3960cae8c4fd9c63e03-2026-09-26T03-14-02-775Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:14:02.811972+00:00
TAMAÑO: 0.007257 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   960 Sep 26 10:14 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:14 accessibility.json
```
FUENTE: oddschecker
CARPETA: fdc1f1e5a0050495cf2270361823a9a369ce0f4af4bc9fb59c38b202b84fb424-2026-09-26T03-11-40-257Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:11:40.293705+00:00
TAMAÑO: 0.007255 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   957 Sep 26 10:11 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:11 accessibility.json
```
FUENTE: stake
CARPETA: ff8d6259f4f0c2b28034c3cf19022ef9ec83c97fbb22b2b60256a56cfe00b413-2026-09-26T03-10-33-998Z-failure
ARCHIVOS: 5
ÚLTIMO: 2026-09-26T03:10:34.033993+00:00
TAMAÑO: 0.007266 MB
ls -lt | head -3:
```text
total 48
-rw-------@ 1 User  staff   969 Sep 26 10:10 context.json
-rw-------@ 1 User  staff  2355 Sep 26 10:10 accessibility.json
```
FUENTE: fightodds-diagnostic-1790394312286
ARCHIVOS: 3
ÚLTIMO: 2026-09-26T03:45:12.889110+00:00
TAMAÑO: 4.714915 MB
ls -lt | head -3:
```text
total 9664
-rw-r--r--@ 1 User  staff    29629 Sep 26 10:45 structure.json
-rw-r--r--@ 1 User  staff  4415428 Sep 26 10:45 dom.json
```
FUENTE: pinnacle-en-browser-1790397298268
ARCHIVOS: 3
ÚLTIMO: 2026-09-26T04:35:24.185988+00:00
TAMAÑO: 0.922569 MB
ls -lt | head -3:
```text
total 1896
-rw-r--r--@ 1 User  staff   35593 Sep 26 11:35 diagnostic.json
-rw-r--r--@ 1 User  staff  727254 Sep 26 11:35 page.png
```
FUENTE: pinnacle-feed-diagnostic-1790397337932
ARCHIVOS: 1
ÚLTIMO: 2026-09-26T04:36:02.641072+00:00
TAMAÑO: 6.246891 MB
ls -lt | head -3:
```text
total 12800
-rw-r--r--@ 1 User  staff  6550340 Sep 26 11:36 feeds.json
```
FUENTE: winpot-sport-browser-diagnostic-1790504179379
ARCHIVOS: 5
ÚLTIMO: 2026-09-27T10:17:07.998927+00:00
TAMAÑO: 6.919999 MB
ls -lt | head -3:
```text
total 14184
-rw-r--r--@ 1 User  staff    26785 Sep 27 17:17 GetTopEvents.json
-rw-r--r--@ 1 User  staff    11042 Sep 27 17:16 context.json
```
# BLOQUE 2 — MUESTRA CRUDA POR BACKEND
## Kambi — .engine/raw/497d3df91e07c66b32f88e6daf25245838fe89def144f92a6f61b063accc980e-1790512978557-network.json
TAMAÑO_BYTES: 7511920
```json
{
  "source": {
    "url": "https://www.rushbet.co/?page=sportsbook",
    "type": "rushbet-co"
  },
  "method": "network",
  "retrievedAt": "2026-09-27T12:42:58.557Z",
  "recordCount": 2330,
  "evidence": {
    "url": "https://us.offering-api.kambicdn.com/offering/v2018/rsico/listView/all.json?lang=es_ES&market=CO&client_id=200&channel_id=1&ncid=1790512973562&useCombined=true",
    "transport": "fetch",
    "payload": {
      "profileVersion": "rushbet-co-kambi-v1",
      "captures": [
        {
          "url": "https://us.offering-api.kambicdn.com/offering/v2018/rsico/listView/all.json?lang=es_ES&market=CO&client_id=200&channel_id=1&ncid=1790512973562&useCombined=true",
          "payload": {
            "events": [
              {
                "event": {
                  "id": 1026752375,
                  "name": "Sudáfrica - Australia",
                  "nameDelimiter": "-",
                  "englishName": "South Africa - Australia",
                  "homeName": "Sudáfrica",
                  "awayName": "Australia",
                  "start": "2026-09-27T07:58:00Z",
                  "group": "Encuentros",
                  "groupId": 2000125174,
                  "path": [
                    {
                      "id": 1000093178,
                      "name": "Críquet",
                      "englishName": "Cricket",
                      "termKey": "cricket"
                    },
                    {
                      "id": 2000085728,
                      "name": "Partido internacional de un día",
                      "englishName": "International One Day",
                      "termKey": "international_one_day"
                    },
                    {
                      "id": 2000125174,
                      "name": "Encuentros",
                      "englishName": "Matches",
                      "termKey": "matches"
                    }
                  ],
                  "nonLiveBoCount": 7,
                  "liveBoCoun
```
TRUNCADO: primeros 2000 caracteres de 7506853 caracteres
## Altenar — .engine/raw/7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-1790505209364-network.json
TAMAÑO_BYTES: 140000
```json
{
  "source": {
    "url": "https://www.winpot.mx/sport",
    "type": "winpot"
  },
  "method": "network",
  "retrievedAt": "2026-09-27T10:33:29.364Z",
  "recordCount": 48,
  "evidence": {
    "url": "https://sb2frontend-altenar2.biahosted.com/api/widget/GetTopEvents?culture=es-ES&timezoneOffset=-420&integration=winpot.mx&deviceType=1&numFormat=es-ES&countryCode=MX&eventCount=0&sportId=0&timePeriod=0",
    "transport": "fetch",
    "payload": {
      "profileVersion": "winpot-network-v1",
      "captures": [
        {
          "url": "https://sb2frontend-altenar2.biahosted.com/api/widget/GetTopEvents?culture=es-ES&timezoneOffset=-420&integration=winpot.mx&deviceType=1&numFormat=es-ES&countryCode=MX&eventCount=0&sportId=0&timePeriod=0",
          "payload": {
            "markets": [
              {
                "oddIds": [
                  4535605008,
                  4535605009,
                  4535605010
                ],
                "headerName": "1x2",
                "typeId": 1,
                "sportMarketId": 70472,
                "id": 1743292123,
                "name": "1x2"
              },
              {
                "oddIds": [
                  4436444865,
                  4436444866,
                  4436444867
                ],
                "headerName": "1x2",
                "typeId": 1,
                "sportMarketId": 70472,
                "id": 1711926491,
                "name": "1x2"
              },
              {
                "oddIds": [
                  4436450070,
                  4436450071,
                  4436450072
                ],
                "headerName": "1x2",
                "typeId": 1,
                "sportMarketId": 70472,
                "id": 1711928317,
                "name": "1x2"
              },
              {
                "oddIds": [
                  4436443426,
                  4436443427,
                  4436443428
                ],
                "headerName": "1x2",
```
TRUNCADO: primeros 2000 caracteres de 139895 caracteres
## BetB2B expressDay — .engine/raw/da4ac8abe5ab2d5a386eba2e46b481d0ea4c2b04ea72594d07cf6e252925c103-1790658353562-network.json
TAMAÑO_BYTES: 444833
```json
{
  "source": {
    "url": "https://1xbet.co.ke/en",
    "type": "1xbet"
  },
  "method": "network",
  "retrievedAt": "2026-09-29T05:05:53.563Z",
  "recordCount": 113,
  "evidence": {
    "url": "https://1xbet.co.ke/service-api/main-line-feed/v3/expressDay?cfView=3&fcountry=71&gr=656&lng=en&ref=61",
    "transport": "fetch",
    "payload": {
      "profileVersion": "onexbet-betb2b-v1",
      "captures": [
        {
          "url": "https://1xbet.co.ke/service-api/main-line-feed/v3/expressDay?cfView=3&fcountry=71&gr=656&lng=en&ref=61",
          "mode": "line",
          "payload": [
            {
              "events": [
                {
                  "sport": {
                    "timeName": "innings",
                    "timesName": "innings",
                    "id": 66,
                    "name": "Cricket"
                  },
                  "liga": {
                    "countryImage": "/sfiles/logo-flag/55308e59c550429455d6957d5acc884d.png",
                    "id": 3096741,
                    "name": "Canada. Super Peel League"
                  },
                  "opponent1": {
                    "fullName": "Mississauga Royals",
                    "countryId": 85,
                    "opps": [
                      {
                        "id": 7785491,
                        "name": "Mississauga Royals",
                        "image": "98a7b89ec2b0b99925119c628d2110c5.png"
                      }
                    ]
                  },
                  "opponent2": {
                    "fullName": "City View Royals",
                    "countryId": 85,
                    "opps": [
                      {
                        "id": 6647457,
                        "name": "City View Royals",
                        "image": "3bd1ce62626ea99967a1eb45ec84de19.png"
                      }
                    ]
                  },
                  "event": {
                    "groupId": 2804,
                    "shortGrou
```
TRUNCADO: primeros 2000 caracteres de 444833 caracteres
## BetB2B Value[].E[] — .engine/raw/4d9056c25203a016956012fe16a66f694b7b8599154340ffa99ba3593d35a9ab-1790665357178-network.json
TAMAÑO_BYTES: 4183623
```json
{
  "source": {
    "url": "https://22match.com/en",
    "type": "22bet"
  },
  "method": "network",
  "retrievedAt": "2026-09-29T07:02:37.178Z",
  "recordCount": 1780,
  "evidence": {
    "url": "https://22match.com/service-api/LineFeed/Get1x2_VZip?count=1000&lng=en_GB&tz=7&mode=4&country=71&partner=151&gr=151",
    "transport": "fetch",
    "payload": {
      "profileVersion": "22bet-betb2b-v1",
      "captures": [
        {
          "url": "https://22match.com/service-api/LineFeed/Get1x2_VZip?count=1000&lng=en_GB&tz=7&mode=4&country=71&partner=151&gr=151",
          "mode": "line",
          "payload": {
            "Id": 0,
            "Success": true,
            "Error": "",
            "ErrorCode": 0,
            "Guid": "",
            "Value": [
              {
                "B": 82732,
                "IG": true,
                "WP": {
                  "P1": 0.4,
                  "P2": 0.58,
                  "PX": 0.02
                },
                "I": 756941346,
                "N": 188343,
                "CI": 374417986,
                "E": [
                  {
                    "T": 402,
                    "C": 1.571,
                    "CV": "1.571",
                    "G": 101
                  },
                  {
                    "T": 3,
                    "C": 1.574,
                    "CV": "1.574",
                    "G": 1
                  },
                  {
                    "T": 401,
                    "C": 2.3,
                    "CV": "2.3",
                    "G": 101
                  },
                  {
                    "T": 1,
                    "C": 2.306,
                    "CV": "2.306",
                    "G": 1
                  },
                  {
                    "T": 2,
                    "C": 50,
                    "CV": "50",
                    "G": 1
                  }
                ],
                "AE": [],
                "EC": 15,
                "TG": "",
     
```
TRUNCADO: primeros 2000 caracteres de 4176119 caracteres
## Pinnacle — .engine/raw/18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790466890729-network.json
TAMAÑO_BYTES: 4877853
```json
{
  "source": {
    "url": "https://www.pinnacle.com/en",
    "type": "pinnacle"
  },
  "method": "network",
  "retrievedAt": "2026-09-26T23:54:50.729Z",
  "recordCount": 4411,
  "evidence": {
    "url": "https://www.pinnacle.com/en/",
    "transport": "fetch",
    "payload": {
      "profileVersion": "pinnacle-network-v1",
      "captures": [
        {
          "url": "https://guest.api.arcadia.pinnacle.com/0.1/matchups/carousel",
          "transport": "fetch",
          "payload": [
            {
              "ageLimit": 0,
              "altTeaser": false,
              "featureOrder": -1,
              "hasAltSpread": false,
              "hasAltTotal": false,
              "hasBetshare": false,
              "hasLive": false,
              "hasMarkets": true,
              "id": 1635222027,
              "isBetshareEnabled": false,
              "isFeatured": false,
              "isHighlighted": false,
              "isLive": false,
              "isPromoted": false,
              "league": {
                "ageLimit": 0,
                "featureOrder": 0,
                "group": "World",
                "id": 199802,
                "isFeatured": true,
                "isHidden": false,
                "isPromoted": false,
                "isSticky": false,
                "matchupCount": 5,
                "matchupCountSE": 5,
                "name": "Team Events - Presidents Cup",
                "sequence": 3,
                "sport": {
                  "featureOrder": 8,
                  "id": 17,
                  "isFeatured": true,
                  "isHidden": false,
                  "isSticky": false,
                  "matchupCount": 54,
                  "matchupCountSE": 54,
                  "name": "Golf",
                  "primaryMarketType": "moneyline"
                }
              },
              "liveMode": null,
              "markets": [
                {
                  "cutoffAt": "2026-09-27T11:00:00+00:00",
             
```
TRUNCADO: primeros 2000 caracteres de 4877847 caracteres
## Betsson — .engine/raw/063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790483943274-network.json
TAMAÑO_BYTES: 1254943
```json
{
  "source": {
    "url": "https://www.betsson.mx/apuestas-deportivas",
    "type": "betsson"
  },
  "method": "network",
  "retrievedAt": "2026-09-27T04:39:03.274Z",
  "recordCount": 147,
  "evidence": {
    "url": "https://www.betsson.mx/apuestas-deportivas",
    "transport": "fetch",
    "payload": {
      "profileVersion": "betsson-network-v1",
      "captures": [
        {
          "url": "https://www.betsson.mx/api/sb/v1/widgets/event-market/v1?includescoreboards=true&marketids=m-173A27FCBBF84162C2A7C68E4518B3DC34525D1D,m-3209463454C780B7A974BA90D4E5EB6D92445725,m-32DC93E41B0EDD3EAB88C88E8302194B2A4AA9D6,m-60E2685BD0B665C41E160063F1F57ABACF52A1DF,m-8B603A1DC52E1A21256F3EF8FF55D9D668ADAEAD,m-971E3844D49CE1FABF5A2B5DE9EDF44B30777D70,m-984E441B38138CFB928168D72B3AEF82C9AF226B,m-A85AD7DD9D2C90642464D192513D201AD5A9DA90,m-CFC6010FE49D8ED63B8E36DE75A6406EC7F47FE8,m-E3F349C24FF45805C8E9D61276EDB308A1A83BEE,m-F2F93F769713D3EC87C5C3ED577C031A63A86893,m-f-1s3apnIL0EOgsvizO6dqTw-1HTG-1.5,m-f-1s3apnIL0EOgsvizO6dqTw-FGSCR-0.5,m-f-1s3apnIL0EOgsvizO6dqTw-MWOU-2.5,m-f-3Ip3_WaC9kGvHY55Ww3iNw-1HTG-1.5,m-f-3Ip3_WaC9kGvHY55Ww3iNw-AGSTPL,m-f-3Ip3_WaC9kGvHY55Ww3iNw-BTTSOU-2.5,m-f-3Ip3_WaC9kGvHY55Ww3iNw-HWTN,m-f-3uLKkolqOkanyK3VybudSg-1HTG-1.5,m-f-3uLKkolqOkanyK3VybudSg-FRSTGOALSB-0.5,m-f-3uLKkolqOkanyK3VybudSg-MWOU-2.5,m-f-BU4FYmpv5U6WMuEjIvTZOw-ATCS,m-f-BU4FYmpv5U6WMuEjIvTZOw-FTCSR,m-f-BU4FYmpv5U6WMuEjIvTZOw-MWOU-2.5,m-f-F_WFP_4ggE-PLb0dXNcXsw-1HTG-1.5",
          "transport": "fetch",
          "payload": {
            "skeleton": {
              "eventIds": [],
              "categories": []
            },
            "topics": {
              "markets": [],
              "selections": [],
              "events": []
            },
            "topicsMap": {
              "topicEventMap": {},
              "eventTopicMap": {}
            },
            "data": {
              "events": [],
              "markets": [],
              "marketSelections": []
            },
        
```
TRUNCADO: primeros 2000 caracteres de 1254782 caracteres
## FEAPI prematch — .engine/raw/2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741641268-network.json
TAMAÑO_BYTES: 5373780
```json
{
  "source": {
    "url": "https://sports.bet9ja.com/",
    "type": "bet9ja"
  },
  "method": "network",
  "retrievedAt": "2026-09-30T04:14:01.268Z",
  "recordCount": 3344,
  "evidence": {
    "url": "https://sports.bet9ja.com/desktop/feapi/PalimpsestAjax/GetSports?DISP=0&v_cache_version=1.328.0.248",
    "transport": "fetch",
    "payload": {
      "profileVersion": "bet9ja-feapi-v1",
      "captures": [
        {
          "mode": "sports",
          "url": "https://sports.bet9ja.com/desktop/feapi/PalimpsestAjax/GetSports?DISP=0&v_cache_version=1.328.0.248",
          "payload": {
            "R": "OK",
            "D": {
              "PAL": {
                "1": {
                  "P": 10,
                  "S_DESC": "Soccer",
                  "TF": [
                    134,
                    3,
                    151,
                    251,
                    1187
                  ],
                  "SG": {
                    "10924": {
                      "P": 5,
                      "SG_LANG": {
                        "en": "Italy"
                      },
                      "TF": [
                        1,
                        0,
                        1,
                        1,
                        58
                      ],
                      "G": {
                        "167856": {
                          "P": 10,
                          "V_I": 0,
                          "TF": [
                            0,
                            0,
                            0,
                            0,
                            20
                          ],
                          "D": "2026-10-16 18:45:00",
                          "IS_BOOSTED": false,
                          "NUM": 20,
                          "G_DESC": "Serie A"
                        },
                        "907202": {
                          "P": 50,
                          "V_I": 0,
                          "TF": [
     
```
TRUNCADO: primeros 2000 caracteres de 5373722 caracteres
CAPTURE_PATH: evidence.payload.captures[1]
```json
{"mode":"prematch","url":"https://sports.bet9ja.com/desktop/feapi/PalimpsestAjax/GetEventsInDailyBundleV3?DISP=1000&DISPH=0&SPORTID=1&LIMIT=10&v_cache_version=1.328.0.248","payload":{"R":"OK","D":{"MK":[{"ID":"S_1X2","NAME":"1X2","P":"1","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"POPULAR","SV":null,"SGN":["1","X","2"],"SGNK":["1","X","2"]},{"ID":"S_1X21","NAME":"1X2 1UP","P":"2","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"POPULAR","SV":null,"SGN":["1","X","2"],"SGNK":["11","X1","21"]},{"ID":"S_1X22","NAME":"1X2 2UP","P":"3","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"POPULAR","SV":null,"SGN":["1","X","2"],"SGNK":["12","X2","22"]},{"ID":"S_DC","NAME":"Double Chance","P":"4","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"POPULAR","SV":null,"SGN":["1X","12","X2"],"SGNK":["1X","12","X2"]},{"ID":"S_OU","NAME":"Over/Under","P":"5","VW":"3","CNT":"G","CNTLABEL":"Goals","GCAT":"POPULAR","SV":null,"SGN":["Over ","Under "],"SGNK":["O","U"]},{"ID":"S_GGNG","NAME":"Goal/No Goal","P":"6","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"POPULAR","SV":null,"SGN":["GG","NG"],"SGNK":["Y","N"]},{"ID":"S_OE","NAME":"Odd/Even","P":"7","VW":"0","CNT":"G","CNTLABEL":"Goals","GCAT":"POPULAR","SV":null,"SGN":["Odd","Even"],"SGNK":["OD","EV"]},{"ID":"S_1X21T","NAME":"1st Half - 1X2","P":"8","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"HT","SV":null,"SGN":["1","X","2"],"SGNK":["1","X","2"]},{"ID":"S_DC1T","NAME":"1st Half - Double Chance","P":"9","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"HT","SV":null,"SGN":["1X","12","X2"],"SGNK":["1X","12","X2"]},{"ID":"S_OU1T","NAME":"1st Half - Over/Under","P":"10","VW":"3","CNT":"G","CNTLABEL":"Goals","GCAT":"HT","SV":null,"SGN":["Over ","Under "],"SGNK":["O","U"]},{"ID":"S_HTFT","NAME":"Half-Time/Full-Time","P":"11","VW":"0","CNT":"GR","CNTLABEL":"Generic Result","GCAT":"POPULAR","SV":"{\"S\": \"/\",\"L1\": \"Half Time\",\"L2\": \"Full Time\",\"DFV\":\"X\"}","SGN":["1/1","1/X
```
TRUNCADO: primeros 2000 caracteres de 49088 caracteres
## FEAPI live — .engine/raw/2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741641268-network.json
TAMAÑO_BYTES: 5373780
```json
{
  "source": {
    "url": "https://sports.bet9ja.com/",
    "type": "bet9ja"
  },
  "method": "network",
  "retrievedAt": "2026-09-30T04:14:01.268Z",
  "recordCount": 3344,
  "evidence": {
    "url": "https://sports.bet9ja.com/desktop/feapi/PalimpsestAjax/GetSports?DISP=0&v_cache_version=1.328.0.248",
    "transport": "fetch",
    "payload": {
      "profileVersion": "bet9ja-feapi-v1",
      "captures": [
        {
          "mode": "sports",
          "url": "https://sports.bet9ja.com/desktop/feapi/PalimpsestAjax/GetSports?DISP=0&v_cache_version=1.328.0.248",
          "payload": {
            "R": "OK",
            "D": {
              "PAL": {
                "1": {
                  "P": 10,
                  "S_DESC": "Soccer",
                  "TF": [
                    134,
                    3,
                    151,
                    251,
                    1187
                  ],
                  "SG": {
                    "10924": {
                      "P": 5,
                      "SG_LANG": {
                        "en": "Italy"
                      },
                      "TF": [
                        1,
                        0,
                        1,
                        1,
                        58
                      ],
                      "G": {
                        "167856": {
                          "P": 10,
                          "V_I": 0,
                          "TF": [
                            0,
                            0,
                            0,
                            0,
                            20
                          ],
                          "D": "2026-10-16 18:45:00",
                          "IS_BOOSTED": false,
                          "NUM": 20,
                          "G_DESC": "Serie A"
                        },
                        "907202": {
                          "P": 50,
                          "V_I": 0,
                          "TF": [
     
```
TRUNCADO: primeros 2000 caracteres de 5373722 caracteres
CAPTURE_PATH: evidence.payload.captures[2]
```json
{"mode":"live","url":"https://sports.bet9ja.com/desktop/feapi/PalimpsestLiveAjax/GetLiveEventsV3?v_cache_version=1.328.0.248","payload":{"R":"OK","D":{"S":{"3000001":{"S_ID":"3000001","S_DESC":"Soccer","S_INCTYPE":"3","S_LANG":"{\"en\":\"Soccer\",\"es\":\"Soccer\"}","P":"11","S_KEY":"LIVES","S_RES_FREQ":"0","S_STID":"1","C":80},"3000003":{"S_ID":"3000003","S_DESC":"Baseball","S_INCTYPE":"3","S_LANG":"{\"en\":\"Baseball\",\"es\":\"Baseball\"}","P":"81","S_KEY":"LIVEBS","S_RES_FREQ":"0","S_STID":"3","C":2},"3000004":{"S_ID":"3000004","S_DESC":"Ice Hockey","S_INCTYPE":"3","S_LANG":"{\"en\":\"Ice Hockey\",\"es\":\"Ice Hockey\"}","P":"121","S_KEY":"LIVEIH","S_RES_FREQ":"0","S_STID":"4","C":2},"3000005":{"S_ID":"3000005","S_DESC":"Tennis","S_INCTYPE":"3","S_LANG":"{\"en\":\"Tennis\",\"es\":\"Tennis\"}","P":"31","S_KEY":"LIVET","S_RES_FREQ":"0","S_STID":"5","C":24},"3000020":{"S_ID":"3000020","S_DESC":"Table Tennis","S_INCTYPE":"3","S_LANG":"{\"en\":\"Table Tennis\",\"es\":\"Table Tennis\"}","P":"5000","S_KEY":"LIVETT","S_RES_FREQ":"0","S_STID":"14","C":5},"3000034":{"S_ID":"3000034","S_DESC":"Beach Volley","S_INCTYPE":"3","S_LANG":"{\"en\":\"Beach Volley\",\"es\":\"Beach Volley\"}","P":"5000","S_KEY":"LIVEBV","S_RES_FREQ":"0","S_STID":"17","C":1}},"G":{"21734":{"SPORT":"Soccer","SGID":"3000001_21734","G_PRIORITY":39,"DS":"World - FIFA International Friendlies","SID":3000001,"AP":0,"S_PRIORITY":11,"INT_SID":3000001,"CATEGORY":"Soccer World - FIFA International Friendlies","PARENT":null,"PL":null,"STID":"1"},"29833":{"SPORT":"Soccer","SGID":"3000001_29833","G_PRIORITY":141,"DS":"Premier-Zoom","SID":3000001,"AP":0,"S_PRIORITY":11,"INT_SID":3000001,"CATEGORY":"Soccer Premier-Zoom","PARENT":null,"PL":null,"STID":"1"},"29834":{"SPORT":"Soccer","SGID":"3000001_29834","G_PRIORITY":142,"DS":"Liga-Zoom","SID":3000001,"AP":0,"S_PRIORITY":11,"INT_SID":3000001,"CATEGORY":"Soccer Liga-Zoom","PARENT":null,"PL":null,"STID":"1"},"29851":{"SPORT":"Soccer","SGID":"3000001_29851","G_PRIORITY
```
TRUNCADO: primeros 2000 caracteres de 215088 caracteres
## GraphQL — .engine/raw/df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-1790739669593-network.json
TAMAÑO_BYTES: 89102
```json
{
  "source": {
    "url": "https://www.10cric2026.com/",
    "type": "10cric"
  },
  "method": "network",
  "retrievedAt": "2026-09-30T03:41:09.594Z",
  "recordCount": 27,
  "evidence": {
    "url": "https://www.10cric2026.com/graphql",
    "transport": "graphql",
    "payload": {
      "profileVersion": "10cric-graphql-v1",
      "request": {
        "method": "POST",
        "headers": {
          "accept": "*/*",
          "apollo-require-preflight": "true",
          "apollographql-client-name": "frontoffice-client",
          "content-type": "application/json",
          "origin": "https://www.10cric2026.com",
          "referer": "https://www.10cric2026.com/sports/",
          "x-language": "en",
          "x-operation-name": "listContentCards",
          "x-tenant": "10CRIC"
        },
        "body": "{\"operationName\":\"listContentCards\",\"variables\":{},\"query\":\"query listContentCards {\\n  listContentCards {\\n    contentCards {\\n      ...Card\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment Card on ContentCard {\\n  type\\n  card {\\n    ... on NormalCard {\\n      id\\n      name\\n      selections {\\n        id\\n        name\\n        odds\\n        eventId\\n        marketId\\n        marketLineId\\n        sportId\\n        eventName\\n        participantHomeName\\n        participantAwayName\\n        marketName\\n        eventStartDate\\n        leagueId\\n        leagueName\\n        sportName\\n        status\\n        eventUrlPath\\n        isLive\\n        __typename\\n      }\\n      label {\\n        name\\n        type\\n        __typename\\n      }\\n      imageUrl\\n      betsCount\\n      colorOptions {\\n        backgroundColorHex\\n        useDarkVersion\\n        fontColorHex\\n        __typename\\n      }\\n      __typename\\n    }\\n    ... on BoostedCard {\\n      id\\n      name\\n      percentage\\n      selections {\\n        id\\n        name\\n        odds\\n        eventId\\n        marketId\\n     
```
TRUNCADO: primeros 2000 caracteres de 89102 caracteres
## React Flight — .engine/raw/bed9900eb3383ce6fb61b25a84b95ad6f009b6e96f8aabb7c51269f34dcb5951-1790505214444-network.json
TAMAÑO_BYTES: 749913
```json
{
  "source": {
    "url": "https://betway.mx/mx/es-mx/sports",
    "type": "betway"
  },
  "method": "network",
  "retrievedAt": "2026-09-27T10:33:34.444Z",
  "recordCount": 272,
  "evidence": {
    "url": "https://betway.mx/mx/es-mx/sports",
    "transport": "http",
    "payload": {
      "profileVersion": "betway-flight-v1",
      "captures": [
        {
          "url": "https://betway.mx/mx/es-mx/sports",
          "payload": [
            {
              "events": {},
              "markets": {},
              "outcomes": {},
              "scoreboards": {}
            },
            {
              "events": {},
              "markets": {},
              "outcomes": {},
              "scoreboards": {}
            },
            {
              "events": {
                "17264069": {
                  "id": 17264069,
                  "version": 6,
                  "started": false,
                  "name": "Pumas UNAM - Atlético San Luis",
                  "trading": "live",
                  "outright": false,
                  "suspended": false,
                  "groupName": "Liga MX",
                  "groupCName": "liga-mx",
                  "categoryName": "Fútbol",
                  "categoryCName": "soccer",
                  "subcategoryName": "México",
                  "subcategoryCName": "mexico",
                  "sameGameParlay": {
                    "success": false,
                    "fixtureId": ""
                  },
                  "startsAt": "2026-09-27T18:00:00.000Z",
                  "isBetBuilderSupported": true,
                  "isSameGameParlayActive": false,
                  "liveStreamingIcon": false
                },
                "17266011": {
                  "id": 17266011,
                  "version": 6,
                  "started": false,
                  "name": "Club León - Juarez",
                  "trading": "live",
                  "outright": false,
                  "suspended": false,
       
```
TRUNCADO: primeros 2000 caracteres de 749294 caracteres
## Kmianko — .engine/raw/84a2b728f9336952f1ffd6a45e554cdb91dc2ef542320694d71fd08edc03aee4-1790562899564-network.json
TAMAÑO_BYTES: 106008
```json
{
  "source": {
    "url": "https://www.apuestatotal.com/apuestas-deportivas/",
    "type": "apuestatotal"
  },
  "method": "network",
  "retrievedAt": "2026-09-28T02:34:59.564Z",
  "recordCount": 50,
  "evidence": {
    "url": "https://prod20392.kmianko.com/api/sportscenter/carousels/v3/featured-carousel-items?language=ES-PE&customerLevel=0&epoEnabled=true&selectedOptionId=0&hasPlacedBets=false&isAnonymous=true&currencyCode=PEN&types=8%2C6%2C7%2C9&marketTypes=ML587%2CML0%2COU0%2CHC0%2CML39%2COU39%2CHC39&marketTypesBySports=%7B%221%22%3A%5B%22ML0%22%2C%22ML39%22%2C%22OU200%22%2C%22OU249%22%2C%22QA61%22%2C%22QA158%22%5D%2C%226%22%3A%5B%22ML0%22%2C%22OU0%22%2C%22HC0%22%2C%22ML39%22%2C%22OU39%22%2C%22HC39%22%2C%22ML716%22%2C%22ML717%22%2C%22ML718%22%2C%22ML719%22%2C%22ML720%22%5D%2C%2259%22%3A%5B%22ML587%22%2C%22ML0%22%2C%22OU0%22%2C%22HC0%22%2C%22ML39%22%2C%22OU39%22%2C%22HC39%22%5D%2C%22default%22%3A%5B%22ML0%22%2C%22OU0%22%2C%22HC0%22%2C%22ML39%22%2C%22OU39%22%2C%22HC39%22%2C%22OU6001%22%5D%7D&minimumOddsRestrictedMarkets=ML39%2CML13%2CML1%2CML169&minimumOdds=1.009&draft=false",
    "transport": "fetch",
    "payload": {
      "profileVersion": "apuestatotal-kmianko-v1",
      "records": [
        {
          "sportsbook": "apuestatotal",
          "bookmaker": "apuestatotal",
          "sport": "Fútbol",
          "competition": "UEFA Liga de Naciones A",
          "eventName": "Bélgica vs Francia",
          "participants": [
            "Bélgica",
            "Francia"
          ],
          "homeParticipant": "Bélgica",
          "awayParticipant": "Francia",
          "eventStartTime": "2026-09-28T18:45:00.000Z",
          "eventStatus": "prematch",
          "market": "Resultado del partido (1X2)",
          "marketPeriod": null,
          "selection": "Francia",
          "selectionStatus": null,
          "line": null,
          "rawOdds": "1.88",
          "rawOddsFormat": "decimal",
          "decimalOdds": 1.88,
          "sourceEventId": "889841824884338
```
TRUNCADO: primeros 2000 caracteres de 105840 caracteres
## Codere — .engine/raw/9bf0691c2194341d046a1a63bd9a9350002ea015cc8e84db1a4bce871fa4f66c-1790505215265-network.json
TAMAÑO_BYTES: 224743
```json
{
  "source": {
    "url": "https://www.codere.mx/",
    "type": "codere"
  },
  "method": "network",
  "retrievedAt": "2026-09-27T10:33:35.265Z",
  "recordCount": 69,
  "evidence": {
    "url": "https://codere-sbs-es.azurewebsites.net/getMatchMarketsForType/45349/MRES",
    "transport": "fetch",
    "payload": {
      "profileVersion": "codere-contentapi-v1",
      "captures": [
        {
          "url": "https://codere-sbs-es.azurewebsites.net/getMatchMarketsForType/45349/MRES",
          "payload": {
            "ContentAPI": {
              "@xmlns": "http://www.geneity.co.uk/genbet/ContentAPI",
              "@status": "OK",
              "@timezone": "UTC",
              "@msg_stamp": "MjgwNDE4MTg3MDoxMDU3OmVu",
              "@version": "1.0",
              "@request": "get_match_markets_for_type",
              "Sport": [
                {
                  "@sport_code": "FOOT",
                  "@name": "Football",
                  "@disporder": "0",
                  "SBClass": [
                    {
                      "@sb_class_id": "25294",
                      "@name": "Mexico",
                      "@disporder": "-9595",
                      "SBType": [
                        {
                          "@sb_type_id": "45349",
                          "@name": "Liga MX",
                          "@disporder": "-9000",
                          "Ev": [
                            {
                              "@inplay_allowed": "Y",
                              "@status": "A",
                              "@name": "Pumas UNAM v Atlético San Luis",
                              "@start_time": "09/27/2026 18:00:00",
                              "@virtual": "N",
                              "@ev_timezone": "Europe/London",
                              "@inplay_now": "N",
                              "@mkt_count": "294",
                              "@ev_id": "13924960",
                              "@disporder": "-21",
            
```
TRUNCADO: primeros 2000 caracteres de 224701 caracteres
# BLOQUE 3 — INSPECCIÓN DEL CÓDIGO EXISTENTE
COMANDO: ls -la src/matching
```text
total 88
drwxr-xr-x@  3 User  staff     96 Sep 23 16:40 .
drwxr-xr-x@ 27 User  staff    864 Sep 30 11:26 ..
-rw-r--r--@  1 User  staff  41179 Sep 23 16:40 service.ts
```
EXIT: 0
ARCHIVO: src/matching/service.ts
LÍNEAS: 377
```typescript
import type { PoolClient } from "pg";

export const MATCH_STATUSES = ["MATCHED", "AMBIGUOUS", "UNMATCHED", "CONFLICT"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

type SourceEvent = {
  id: number; sportsbook: string; sourceEventId: string; sport: string | null; competition: string | null;
  eventName: string | null; participants: string[] | null; home: string | null; away: string | null;
  startTime: string | null; status: string | null;
};
type SourceMarket = {
  id: number; eventId: number; sportsbook: string; canonicalEventId: number; market: string | null;
  period: string | null; player: string | null; home: string | null; away: string | null; status: string | null;
};
type SourceSelection = SourceMarket & { selectionId: number; selection: string | null; line: string | null };
type EventEvidence = { method: string; confidence: number; reasons: Record<string, unknown> };
type SemanticMarket = { family: string; typeKey: string; subjectKind: string; subjectKey: string | null; periodKey: string; ambiguous: boolean };
type SemanticSelection = { selectionKey: string; lineKey: string | null; ambiguous: boolean };
type Decision = { canonicalId: number | null; status: MatchStatus; method: string; confidence: number; sources: string[]; evidence: Record<string, unknown> };

const noise = new Set(["fc", "cf", "afc", "sc", "ac", "bc", "club", "the"]);
const compact = (value: string | null | undefined): string => (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
export const stableName = (value: string | null | undefined): string => compact(value).split(" ").filter((part) => !noise.has(part)).join(" ");
const sportKey = (value: string | null): string => stableName(value);
/** Competition codes disambiguate provider labels such as football/NFL and hockey/NHL. */
const eventSportKey = (event: Pick<SourceEvent, "sport" | "competition">): string => {
  const competition = stableName(event.competition);
  if (["nfl", "ncaaf"].includes(competition)) return "american_football";
  if (["nhl", "ahl"].includes(competition)) return "ice_hockey";
  if (["nba", "wnba", "ncaab"].includes(competition)) return "basketball";
  if (competition === "mlb") return "baseball";
  return sportKey(event.sport);
};
const unique = <T>(items: T[]): T[] => [...new Set(items)];
const containsWholePhrase = (text: string, phrase: string): boolean => {
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(text);
};
const sourceNamespace = (source: string): string => /^(actionnetwork|bfo|fightodds)-/.test(source) ? source.split("-", 1)[0]! : source;
const lifecycle = (status: string | null): "LIVE" | "PREMATCH" | "OTHER" => /live|inprogress|in progress|in_play|inplay/i.test(status ?? "") ? "LIVE" : /pre|scheduled|upcoming/i.test(status ?? "") ? "PREMATCH" : "OTHER";
const sourceParticipants = (event: SourceEvent): [string, string] | null => {
  if (event.home && event.away) return [event.home, event.away];
  if (event.participants?.length === 2) return [event.participants[1]!, event.participants[0]!];
  const parts = (event.eventName ?? "").split(/\s+(?:@|vs?\.?|v\.)\s+/i).map((part) => part.trim()).filter(Boolean);
  return parts.length === 2 ? [parts[1]!, parts[0]!] : null;
};
const eventPairKey = (event: SourceEvent): string | null => {
  const pair = sourceParticipants(event); if (!pair) return null;
  const values = pair.map(stableName); return values.every(Boolean) ? values.sort().join("|") : null;
};
const samePair = (left: SourceEvent, right: SourceEvent): boolean => eventPairKey(left) !== null && eventPairKey(left) === eventPairKey(right);
const sameOrientation = (left: SourceEvent, right: SourceEvent): boolean => !left.home || !left.away || !right.home || !right.away || (stableName(left.home) === stableName(right.home) && stableName(left.away) === stableName(right.away));
const startDistanceMinutes = (left: SourceEvent, right: SourceEvent): number | null => left.startTime && right.startTime ? Math.abs(Date.parse(left.startTime) - Date.parse(right.startTime)) / 60_000 : null;

/** Pure and deliberately strict: a rejected comparison never becomes a fuzzy match. */
export const compareEvents = (left: SourceEvent, right: SourceEvent): EventEvidence | null => {
  if (left.id === right.id || left.sportsbook === right.sportsbook) return null;
  const leftSport = eventSportKey(left); const rightSport = eventSportKey(right);
  const sameNamespaceId = sourceNamespace(left.sportsbook) === sourceNamespace(right.sportsbook) && left.sourceEventId === right.sourceEventId;
  if (leftSport && rightSport && leftSport !== rightSport) return null;
  const leftCompetition = stableName(left.competition); const rightCompetition = stableName(right.competition);
  if (sameNamespaceId) {
    // A namespace ID is authoritative only until supplied semantics contradict it.
    if ((leftCompetition && rightCompetition && leftCompetition !== rightCompetition) || (eventPairKey(left) && eventPairKey(right) && !samePair(left, right))) return null;
    return { method: "EXTERNAL_ID_NAMESPACE", confidence: 0.995, reasons: { sourceNamespace: sourceNamespace(left.sportsbook), externalEventId: left.sourceEventId, sport: leftSport || null, competition: leftCompetition || rightCompetition || null } };
  }
  if (!leftSport || !rightSport || leftSport !== rightSport || !samePair(left, right) || !sameOrientation(left, right)) return null;
  if (leftCompetition && rightCompetition && leftCompetition !== rightCompetition) return null;
  const minutes = startDistanceMinutes(left, right);
  if (minutes !== null && minutes > 180) return null;
  const leftLifecycle = lifecycle(left.status); const rightLifecycle = lifecycle(right.status);
  // Status is timing evidence, not identity. Stale source projections may be
  // prematch while another source has correctly moved to live.
  if (leftLifecycle !== "OTHER" && rightLifecycle !== "OTHER" && leftLifecycle !== rightLifecycle && minutes === null) return null;
  // Without an ID, a pair must have either competition or time evidence in addition to sport + participants.
  if (!leftCompetition && !rightCompetition && minutes === null) return null;
  const method = minutes === null ? "SPORT_COMPETITION_PARTICIPANTS" : "SPORT_COMPETITION_PARTICIPANTS_TIME";
  return { method, confidence: minutes === null ? 0.93 : (leftLifecycle !== "OTHER" && rightLifecycle !== "OTHER" && leftLifecycle !== rightLifecycle ? 0.95 : 0.97), reasons: { sport: leftSport, competition: leftCompetition || rightCompetition || null, participantPair: eventPairKey(left), homeAway: Boolean(left.home && left.away && right.home && right.away), startDeltaMinutes: minutes, lifecycle: leftLifecycle === "OTHER" ? rightLifecycle : leftLifecycle, lifecycleConflict: leftLifecycle !== "OTHER" && rightLifecycle !== "OTHER" && leftLifecycle !== rightLifecycle } };
};

class UnionFind {
  private readonly parent = new Map<number, number>();
  constructor(items: number[]) { for (const item of items) this.parent.set(item, item); }
  find(item: number): number { const parent = this.parent.get(item) ?? item; if (parent === item) return item; const root = this.find(parent); this.parent.set(item, root); return root; }
  union(left: number, right: number): void { const a = this.find(left); const b = this.find(right); if (a !== b) this.parent.set(Math.max(a, b), Math.min(a, b)); }
}

const slug = (value: string | null | undefined): string => stableName(value).replace(/ /g, "_");
const normalizedLine = (line: string | null): string | null => {
  if (!line) return null;
  const text = line.replace(/½/g, ".5").replace(/¼/g, ".25").replace(/¾/g, ".75").replace(/(\d+)\s+1\/2\b/g, "$1.5").replace(/(\d+)\s+1\/4\b/g, "$1.25").replace(/(\d+)\s+3\/4\b/g, "$1.75").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text); return Number.isFinite(number) ? String(number) : null;
};
const periodKey = (period: string | null): string => {
  const key = compact(period);
  if (!key || key === "game" || key === "full game" || key === "unknown" || key === "match") return "FULL_GAME";
  if (/^(first|1st) half$|^1h$/.test(key)) return "H1";
  if (/^(second|2nd) half$|^2h$/.test(key)) return "H2";
  const quarter = /^(?:quarter|q)\s*([1-9])$/.exec(key); if (quarter) return `Q${quarter[1]}`;
  const periodMatch = /^(?:period|p)\s*([1-9])$/.exec(key); if (periodMatch) return `P${periodMatch[1]}`;
  return slug(period);
};
export const semanticMarket = (record: Pick<SourceMarket, "market" | "period" | "player" | "home" | "away">): SemanticMarket => {
  const raw = compact(record.market); const key = slug(record.market); const player = stableName(record.player);
  const teamTotal = /team (?:total|score)/.test(raw); const playerProp = Boolean(player) || /player|athlete/.test(raw);
  let family = "OTHER"; let typeKey = key || "unknown"; let subjectKind = "EVENT"; let subjectKey: string | null = null;
  if (/money\s*line|moneyline|match winner|winner/.test(raw)) { family = "MONEYLINE"; typeKey = "moneyline"; }
  else if (/spread|handicap|run line|puck line/.test(raw)) { family = "SPREAD"; typeKey = "spread"; }
  else if (teamTotal) { family = "TEAM_TOTAL"; const remainder = raw.replace(/team (?:total|score)/g, "").trim(); typeKey = remainder ? `team_total_${slug(remainder)}` : "team_total"; subjectKind = "TEAM"; const named = [record.home, record.away].find((name) => containsWholePhrase(raw, stableName(name))); subjectKey = named ? stableName(named) : null; }
  else if (/odd even.*total|total.*odd even/.test(raw)) { family = "EVENT_PROP"; typeKey = "total_odd_even"; }
  else if (/exact.*total|total.*exact/.test(raw)) { family = "EVENT_PROP"; typeKey = "total_exact"; }
  else if (/range.*total|total.*range|bands?/.test(raw)) { family = "EVENT_PROP"; typeKey = /bands?/.test(raw) ? "total_bands" : "total_range"; }
  else if (/mma prop/.test(raw)) { family = "EVENT_PROP"; typeKey = key || "mma_prop"; }
  else if (/total|over under|o u/.test(raw)) { family = "TOTAL"; typeKey = raw.includes("goal") ? "total_goals" : raw.includes("round") ? "total_rounds" : "total"; }
  else if (playerProp) { family = "PLAYER_PROP"; typeKey = `player_prop_${key || "unknown"}`; subjectKind = "PLAYER"; subjectKey = player || null; }
  const ambiguous = !key || (family === "TEAM_TOTAL" && !subjectKey) || (family === "PLAYER_PROP" && !subjectKey);
  return { family, typeKey, subjectKind, subjectKey, periodKey: periodKey(record.period), ambiguous };
};
export const semanticSelection = (record: Pick<SourceSelection, "selection" | "line" | "home" | "away">, market: SemanticMarket): SemanticSelection => {
  const selection = compact(record.selection); const home = stableName(record.home); const away = stableName(record.away);
  let selectionKey = selection ? `LABEL:${slug(record.selection)}` : "UNKNOWN";
  if (/^(over|o)(?:\s|$)/.test(selection)) selectionKey = "OVER";
  else if (/^(under|u)(?:\s|$)/.test(selection)) selectionKey = "UNDER";
  else if (/^(draw|tie|x)(?:\s|$)/.test(selection)) selectionKey = "DRAW";
  else if (/^(home|h)(?:\s|$)/.test(selection)) selectionKey = "HOME";
  else if (/^(away|a)(?:\s|$)/.test(selection)) selectionKey = "AWAY";
  else if (home && selection === home) selectionKey = "HOME";
  else if (away && selection === away) selectionKey = "AWAY";
  else {
    // Some providers repeat the period in a team selection ("Dodgers - 1H").
    const teamPrefix = stableName((record.selection ?? "").replace(/\s+-\s+(?:l?\d+[hip]|\d+(?:st|nd|rd|th)\s+(?:inning|half))$/i, ""));
    if (home && teamPrefix === home) selectionKey = "HOME";
    else if (away && teamPrefix === away) selectionKey = "AWAY";
    else if (market.family === "SPREAD") {
      const withoutSpread = stableName((record.selection ?? "").replace(/\s+[+-]?\d+(?:\.\d+)?\s*$/u, ""));
      if (home && withoutSpread === home) selectionKey = "HOME";
      else if (away && withoutSpread === away) selectionKey = "AWAY";
    }
  }
  // Some APIs place the line in the displayed selection ("Over 2½" or
  // "Team A -1.5") instead of the dedicated line field. Extract only a
  // terminal numeric token, never arbitrary numbers from proposition labels.
  const embeddedLine = /(?:^|\s)([+-]?\d+(?:\.\d+)?|[+-]?\d+[½¼¾])\s*$/u.exec((record.selection ?? "").trim())?.[1] ?? null;
  const lineKey = normalizedLine(record.line) ?? normalizedLine(embeddedLine);
  const requiresLine = market.family === "SPREAD" || market.family === "TOTAL" || market.family === "TEAM_TOTAL";
  const sideRequired = ["MONEYLINE", "SPREAD", "TOTAL", "TEAM_TOTAL"].includes(market.family);
  const ambiguous = market.ambiguous || selectionKey === "UNKNOWN" || (requiresLine && lineKey === null) || (sideRequired && selectionKey.startsWith("LABEL:"));
  return { selectionKey, lineKey, ambiguous };
};

const marketIdentity = (semantic: SemanticMarket): string => JSON.stringify([semantic.family, semantic.typeKey, semantic.subjectKind, semantic.subjectKey, semantic.periodKey]);
const selectionIdentity = (semantic: SemanticSelection): string => JSON.stringify([semantic.selectionKey, semantic.lineKey]);
const asEvents = (rows: Record<string, unknown>[]): SourceEvent[] => rows.map((row) => ({ id: Number(row.id), sportsbook: String(row.sportsbook), sourceEventId: String(row.source_event_id), sport: row.sport as string | null, competition: row.competition as string | null, eventName: row.event_name as string | null, participants: row.participants as string[] | null, home: row.home_participant as string | null, away: row.away_participant as string | null, startTime: row.event_start_time ? new Date(row.event_start_time as string).toISOString() : null, status: row.event_status as string | null }));

async function writeDecision(client: PoolClient, kind: "event" | "market" | "selection", sourceId: number, decision: Decision): Promise<void> {
  const table = `${kind}_matches`; const history = `${kind}_match_decisions`; const idColumn = `${kind}_id`; const canonicalColumn = `canonical_${kind}_id`;
  const sourceJson = JSON.stringify(decision.sources); const evidenceJson = JSON.stringify(decision.evidence);
  const existing = await client.query(`SELECT ${canonicalColumn},status,match_method,confidence::text,sources,evidence FROM ${table} WHERE ${idColumn}=$1`, [sourceId]);
  const previous = existing.rows[0];
  const changed = !previous || Number(previous[canonicalColumn]) !== decision.canonicalId || previous.status !== decision.status || previous.match_method !== decision.method || Number(previous.confidence) !== decision.confidence || JSON.stringify(previous.sources) !== sourceJson || JSON.stringify(previous.evidence) !== evidenceJson;
  await client.query(`INSERT INTO ${table}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) ON CONFLICT(${idColumn}) DO UPDATE SET ${canonicalColumn}=EXCLUDED.${canonicalColumn},status=EXCLUDED.status,match_method=EXCLUDED.match_method,confidence=EXCLUDED.confidence,sources=EXCLUDED.sources,evidence=EXCLUDED.evidence,evaluated_at=now()`, [sourceId, decision.canonicalId, decision.status, decision.method, decision.confidence, sourceJson, evidenceJson]);
  if (changed) await client.query(`INSERT INTO ${history}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [sourceId, decision.canonicalId, decision.status, decision.method, decision.confidence, sourceJson, evidenceJson]);
}

async function writeDecisionBatch(client: PoolClient, kind: "event" | "market" | "selection", decisions: Array<{ sourceId: number; decision: Decision }>): Promise<void> {
  const table = `${kind}_matches`; const history = `${kind}_match_decisions`; const idColumn = `${kind}_id`; const canonicalColumn = `canonical_${kind}_id`;
  for (let offset = 0; offset < decisions.length; offset += 2_000) {
    const chunk = decisions.slice(offset, offset + 2_000).map(({ sourceId, decision }) => ({ source_id: sourceId, canonical_id: decision.canonicalId, status: decision.status, method: decision.method, confidence: decision.confidence, sources: decision.sources, evidence: decision.evidence }));
    const payload = JSON.stringify(chunk);
    const records = `jsonb_to_recordset($1::jsonb) AS x(source_id bigint,canonical_id bigint,status text,method text,confidence numeric,sources jsonb,evidence jsonb)`;
    await client.query(`INSERT INTO ${history}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence)
      SELECT x.source_id,x.canonical_id,x.status,x.method,x.confidence,x.sources,x.evidence FROM ${records}
      LEFT JOIN ${table} current ON current.${idColumn}=x.source_id
      WHERE current.${idColumn} IS NULL OR ROW(current.${canonicalColumn},current.status,current.match_method,current.confidence,current.sources,current.evidence) IS DISTINCT FROM ROW(x.canonical_id,x.status,x.method,x.confidence,x.sources,x.evidence)`, [payload]);
    await client.query(`INSERT INTO ${table}(${idColumn},${canonicalColumn},status,match_method,confidence,sources,evidence)
      SELECT x.source_id,x.canonical_id,x.status,x.method,x.confidence,x.sources,x.evidence FROM ${records}
      ON CONFLICT(${idColumn}) DO UPDATE SET ${canonicalColumn}=EXCLUDED.${canonicalColumn},status=EXCLUDED.status,match_method=EXCLUDED.match_method,confidence=EXCLUDED.confidence,sources=EXCLUDED.sources,evidence=EXCLUDED.evidence,evaluated_at=now()`, [payload]);
  }
}

async function ensureCanonicalEvent(client: PoolClient, id: number, event: SourceEvent): Promise<void> {
  const sport = eventSportKey(event) || "unknown";
  const competitionKey = stableName(event.competition);
  let competitionId: number | null = null;
  if (competitionKey) {
    const inserted = await client.query<{ id: number }>(`INSERT INTO canonical_competitions(sport_key,canonical_key,display_name) VALUES($1,$2,$3) ON CONFLICT(sport_key,canonical_key) DO UPDATE SET display_name=canonical_competitions.display_name RETURNING id`, [sport, competitionKey, event.competition]);
    competitionId = inserted.rows[0]!.id;
    await client.query(`INSERT INTO competition_aliases(sport_key,alias_key,canonical_competition_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [sport, compact(event.competition), competitionId, sourceNamespace(event.sportsbook), event.competition]);
  }
  const participantId = async (name: string | null): Promise<number | null> => {
    const key = stableName(name); if (!key || !name) return null;
    const inserted = await client.query<{ id: number }>(`INSERT INTO canonical_participants(sport_key,canonical_key,display_name) VALUES($1,$2,$3) ON CONFLICT(sport_key,canonical_key) DO UPDATE SET display_name=canonical_participants.display_name RETURNING id`, [sport, key, name]);
    const participant = inserted.rows[0]!.id;
    await client.query(`INSERT INTO participant_aliases(sport_key,alias_key,canonical_participant_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [sport, compact(name), participant, sourceNamespace(event.sportsbook), name]);
    return participant;
  };
  const homeId = await participantId(event.home); const awayId = await participantId(event.away);
  await client.query(`INSERT INTO canonical_events(id,sport_key,canonical_competition_id,home_participant_id,away_participant_id,event_start_time,lifecycle_bucket) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET sport_key=EXCLUDED.sport_key`, [id, sport, competitionId, homeId, awayId, event.startTime, lifecycle(event.status)]);
}

async function hydrateConfirmedAliases(client: PoolClient, source: SourceEvent[]): Promise<SourceEvent[]> {
  const participants = await client.query(`SELECT a.sport_key,a.alias_key,p.canonical_key FROM participant_aliases a JOIN canonical_participants p ON p.id=a.canonical_participant_id`);
  const competitions = await client.query(`SELECT a.sport_key,a.alias_key,c.canonical_key FROM competition_aliases a JOIN canonical_competitions c ON c.id=a.canonical_competition_id`);
  const participantMap = new Map(participants.rows.map((row) => [`${row.sport_key}\u0000${row.alias_key}`, String(row.canonical_key)]));
  const competitionMap = new Map(competitions.rows.map((row) => [`${row.sport_key}\u0000${row.alias_key}`, String(row.canonical_key)]));
  return source.map((event) => {
    const sport = eventSportKey(event);
    const resolveParticipant = (name: string | null): string | null => name ? participantMap.get(`${sport}\u0000${compact(name)}`) ?? name : null;
    return { ...event, competition: event.competition ? competitionMap.get(`${sport}\u0000${compact(event.competition)}`) ?? event.competition : null,
      home: resolveParticipant(event.home), away: resolveParticipant(event.away), participants: event.participants?.map((name) => resolveParticipant(name) ?? name) ?? null };
  });
}

async function persistConfirmedAliases(client: PoolClient, canonicalEventId: number, event: SourceEvent): Promise<void> {
  const canonical = await client.query(`SELECT sport_key,canonical_competition_id,home_participant_id,away_participant_id FROM canonical_events WHERE id=$1`, [canonicalEventId]);
  const row = canonical.rows[0]; if (!row) return;
  const source = sourceNamespace(event.sportsbook);
  if (event.competition && row.canonical_competition_id) await client.query(`INSERT INTO competition_aliases(sport_key,alias_key,canonical_competition_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [row.sport_key, compact(event.competition), row.canonical_competition_id, source, event.competition]);
  for (const [name, participantId] of [[event.home, row.home_participant_id], [event.away, row.away_participant_id]] as const) {
    if (name && participantId) await client.query(`INSERT INTO participant_aliases(sport_key,alias_key,canonical_participant_id,source_namespace,alias_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [row.sport_key, compact(name), participantId, source, name]);
  }
}

async function reconcileEvents(client: PoolClient, requested: Set<number> | null): Promise<Set<number>> {
  if (requested?.size === 0) return requested;
  const result = await client.query(`SELECT e.id,b.key AS sportsbook,e.source_event_id,e.sport,e.competition,e.event_name,e.participants,e.home_participant,e.away_participant,e.event_start_time,e.event_status FROM events e JOIN sportsbooks b ON b.id=e.sportsbook_id ORDER BY e.id`);
  const rawEvents = asEvents(result.rows); const events = await hydrateConfirmedAliases(client, rawEvents);
  const rawById = new Map(rawEvents.map((event) => [event.id, event])); const byId = new Map(events.map((event) => [event.id, event])); const union = new UnionFind(events.map((event) => event.id));
  const byExternal = new Map<string, SourceEvent[]>(); const byPair = new Map<string, SourceEvent[]>();
  const eventDecisions: Array<{ sourceId: number; decision: Decision }> = [];
  for (const event of events) {
    const external = `${sourceNamespace(event.sportsbook)}\u0000${event.sourceEventId}`; byExternal.set(external, [...(byExternal.get(external) ?? []), event]);
    const pair = eventPairKey(event); if (pair && eventSportKey(event)) { const key = `${eventSportKey(event)}\u0000${pair}`; byPair.set(key, [...(byPair.get(key) ?? []), event]); }
  }
  const conflicts = new Map<number, Record<string, unknown>[]>();
  for (const members of byExternal.values()) for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    const evidence = compareEvents(members[i]!, members[j]!);
    if (evidence?.method === "EXTERNAL_ID_NAMESPACE") union.union(members[i]!.id, members[j]!.id);
    else {
      const reason = { kind: "EXTERNAL_ID_SEMANTIC_CONTRADICTION", sourceNamespace: sourceNamespace(members[i]!.sportsbook), externalEventId: members[i]!.sourceEventId, leftEventId: members[i]!.id, rightEventId: members[j]!.id };
      conflicts.set(members[i]!.id, [...(conflicts.get(members[i]!.id) ?? []), reason]); conflicts.set(members[j]!.id, [...(conflicts.get(members[j]!.id) ?? []), reason]);
      // A reused provider ID is no longer authoritative. Remove only the
      // derived canonical lookup, never any source row or observation.
      await client.query(`DELETE FROM canonical_event_external_ids WHERE source_namespace=$1 AND external_event_id=$2`, [sourceNamespace(members[i]!.sportsbook), members[i]!.sourceEventId]);
    }
  }
  const ambiguous = new Map<number, EventEvidence[]>(); const semanticByEvent = new Map<number, Array<{ peer: SourceEvent; evidence: EventEvidence }>>();
  for (const members of byPair.values()) for (let leftIndex = 0; leftIndex < members.length; leftIndex++) for (let rightIndex = leftIndex + 1; rightIndex < members.length; rightIndex++) {
    const left = members[leftIndex]!; const right = members[rightIndex]!; const evidence = compareEvents(left, right);
    if (!evidence || evidence.method === "EXTERNAL_ID_NAMESPACE") continue;
    semanticByEvent.set(left.id, [...(semanticByEvent.get(left.id) ?? []), { peer: right, evidence }]);
    semanticByEvent.set(right.id, [...(semanticByEvent.get(right.id) ?? []), { peer: left, evidence }]);
  }
  // A semantic edge is accepted only when its event has exactly one already-known
  // foreign component. This folds multi-book projections before cross-source matching.
  for (const event of events) {
    const candidates = (semanticByEvent.get(event.id) ?? []).filter(({ peer }) => union.find(peer.id) !== union.find(event.id));
    const roots = unique(candidates.map(({ peer }) => union.find(peer.id)));
    if (roots.length === 1) {
      const selected = candidates.find(({ peer }) => union.find(peer.id) === roots[0])!;
      union.union(event.id, selected.peer.id);
    } else if (roots.length > 1) ambiguous.set(event.id, candidates.map(({ evidence }) => evidence));
  }
  const components = new Map<number, SourceEvent[]>(); for (const event of events) { const root = union.find(event.id); components.set(root, [...(components.get(root) ?? []), event]); }
  const existingResult = await client.query(`SELECT event_id,canonical_event_id FROM event_matches WHERE status='MATCHED' AND canonical_event_id IS NOT NULL`);
  const existingCanonical = new Map(existingResult.rows.map((row) => [Number(row.event_id), Number(row.canonical_event_id)]));
  const componentCanonical = new Map<number, number | null>();
  const componentConflict = new Map<number, number[]>();
  for (const [root, component] of components) {
    const sources = unique(component.map((event) => event.sportsbook)).sort();
    if (sources.length < 2) continue;
    if (component.some((event) => conflicts.has(event.id))) { componentCanonical.set(root, null); continue; }
    const known = unique(component.map((event) => existingCanonical.get(event.id)).filter((id): id is number => id !== undefined));
    if (known.length > 1) { componentCanonical.set(root, null); componentConflict.set(root, known); continue; }
    const canonicalId = known[0] ?? component.reduce((lowest, event) => Math.min(lowest, event.id), Number.MAX_SAFE_INTEGER);
    componentCanonical.set(root, canonicalId);
    const anchor = rawById.get(canonicalId) ?? rawById.get(component[0]!.id)!;
    await ensureCanonicalEvent(client, canonicalId, anchor);
    for (const event of component) {
      const raw = rawById.get(event.id)!;
      await persistConfirmedAliases(client, canonicalId, raw);
      await client.query(`INSERT INTO canonical_event_external_ids(source_namespace,external_event_id,canonical_event_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [sourceNamespace(event.sportsbook), event.sourceEventId, canonicalId]);
    }
  }
  const processIds = requested ? new Set(requested) : new Set(events.map((event) => event.id));
  if (requested) for (const event of events) { const component = components.get(union.find(event.id))!; if (component.some((member) => requested.has(member.id))) processIds.add(event.id); }
  for (const event of events) {
    const component = components.get(union.find(event.id))!; const sources = unique(component.map((item) => item.sportsbook)).sort();
    const root = union.find(event.id); const knownConflict = conflicts.get(event.id); const stableConflict = componentConflict.get(root);
    if (knownConflict || stableConflict) eventDecisions.push({ sourceId: event.id, decision: { canonicalId: null, status: "CONFLICT", method: knownConflict ? "EXTERNAL_ID_SEMANTIC_CONTRADICTION" : "CANONICAL_COMPONENT_COLLISION", confidence: 0, sources, evidence: { conflicts: knownConflict ?? [], canonicalIds: stableConflict ?? [] } } });
    else if (sources.length >= 2) {
      const canonicalId = componentCanonical.get(root)!;
      const namespaces = unique(component.map((item) => sourceNamespace(item.sportsbook))).sort();
      const crossSource = namespaces.length > 1;
      eventDecisions.push({ sourceId: event.id, decision: { canonicalId, status: "MATCHED", method: crossSource ? "EXTERNAL_ID_AND_SEMANTIC_COMPONENT" : "EXTERNAL_ID_NAMESPACE", confidence: crossSource ? 0.97 : 0.995, sources, evidence: { canonicalEventId: canonicalId, componentEventIds: component.map((item) => item.id).sort((a, b) => a - b), sourceNamespaces: namespaces, anchorSourceEvent: byId.get(canonicalId)?.sourceEventId ?? null } } });
    } else if (ambiguous.has(event.id)) {
      const candidates = ambiguous.get(event.id)!;
      eventDecisions.push({ sourceId: event.id, decision: { canonicalId: null, status: "AMBIGUOUS", method: "MULTIPLE_SEMANTIC_CANDIDATES", confidence: 0, sources: [], evidence: { candidateCount: candidates.length, candidates: candidates.map((candidate) => candidate.reasons) } } });
    } else eventDecisions.push({ sourceId: event.id, decision: { canonicalId: null, status: "UNMATCHED", method: "NO_SUFFICIENT_EVIDENCE", confidence: 0, sources: [], evidence: { sport: event.sport, competition: event.competition, participantPair: eventPairKey(event), eventStartTime: event.startTime, lifecycle: lifecycle(event.status) } } });
  }
  await writeDecisionBatch(client, "event", eventDecisions.filter(({ sourceId }) => processIds.has(sourceId)));
  return processIds;
}

const asMarkets = (rows: Record<string, unknown>[]): SourceMarket[] => rows.map((row) => ({ id: Number(row.id), eventId: Number(row.event_id), sportsbook: String(row.sportsbook), canonicalEventId: Number(row.canonical_event_id), market: row.market_type as string | null, period: row.market_period as string | null, player: row.participant_player as string | null, home: row.home_participant as string | null, away: row.away_participant as string | null, status: row.event_status as string | null }));
type CanonicalCache = { markets: Map<string, number>; selections: Map<string, number> };
const cacheMarketKey = (eventId: number, identity: string): string => `${eventId}\u0000${identity}`;
const cacheSelectionKey = (marketId: number, identity: string): string => `${marketId}\u0000${identity}`;
async function canonicalMarketId(client: PoolClient, canonicalEventId: number, semantic: SemanticMarket, cache: CanonicalCache): Promise<number> {
  const key = marketIdentity(semantic);
  const cached = cache.markets.get(cacheMarketKey(canonicalEventId, key)); if (cached) return cached;
  const result = await client.query<{ id: number }>(`INSERT INTO canonical_markets(canonical_event_id,family,type_key,subject_kind,subject_key,period_key,identity_key) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(canonical_event_id,identity_key) DO UPDATE SET identity_key=EXCLUDED.identity_key RETURNING id`, [canonicalEventId, semantic.family, semantic.typeKey, semantic.subjectKind, semantic.subjectKey, semantic.periodKey, key]);
  const id = result.rows[0]!.id; cache.markets.set(cacheMarketKey(canonicalEventId, key), id); return id;
}
async function canonicalSelectionId(client: PoolClient, canonicalMarketIdValue: number, semantic: SemanticSelection, cache: CanonicalCache): Promise<number> {
  const key = selectionIdentity(semantic);
  const cached = cache.selections.get(cacheSelectionKey(canonicalMarketIdValue, key)); if (cached) return cached;
  const result = await client.query<{ id: number }>(`INSERT INTO canonical_selections(canonical_market_id,selection_key,line_key,identity_key) VALUES($1,$2,$3,$4) ON CONFLICT(canonical_market_id,identity_key) DO UPDATE SET identity_key=EXCLUDED.identity_key RETURNING id`, [canonicalMarketIdValue, semantic.selectionKey, semantic.lineKey, key]);
  const id = result.rows[0]!.id; cache.selections.set(cacheSelectionKey(canonicalMarketIdValue, key), id); return id;
}

async function reconcileMarketsAndSelections(client: PoolClient, eventIds: Set<number>): Promise<void> {
  if (!eventIds.size) return;
  const scopedEventIds = [...eventIds];
  const canonicalMarketRows = await client.query(`SELECT id,canonical_event_id,identity_key FROM canonical_markets`);
  const canonicalSelectionRows = await client.query(`SELECT id,canonical_market_id,identity_key FROM canonical_selections`);
  const cache: CanonicalCache = { markets: new Map(canonicalMarketRows.rows.map((row) => [cacheMarketKey(Number(row.canonical_event_id), String(row.identity_key)), Number(row.id)])), selections: new Map(canonicalSelectionRows.rows.map((row) => [cacheSelectionKey(Number(row.canonical_market_id), String(row.identity_key)), Number(row.id)])) };
  const eventDecisions = await client.query(`SELECT event_id,status,canonical_event_id FROM event_matches`);
  const matchedEvents = new Map(eventDecisions.rows.filter((row) => row.status === "MATCHED" && row.canonical_event_id !== null).map((row) => [Number(row.event_id), Number(row.canonical_event_id)]));
  const marketRows = await client.query(`SELECT m.id,m.event_id,b.key AS sportsbook,em.canonical_event_id,m.market_type,m.market_period,m.participant_player,e.home_participant,e.away_participant,e.event_status FROM markets m JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN event_matches em ON em.event_id=e.id WHERE m.event_id=ANY($1::bigint[]) ORDER BY m.id`, [scopedEventIds]);
  const allMarkets = asMarkets(marketRows.rows).map((market) => ({ ...market, canonicalEventId: matchedEvents.get(market.eventId) ?? 0 })); const matchedMarkets = allMarkets.filter((market) => market.canonicalEventId > 0);
  const selectionRows = await client.query(`SELECT s.id AS selection_id,s.selection_name,s.line,m.id,m.event_id,b.key AS sportsbook,em.canonical_event_id,m.market_type,m.market_period,m.participant_player,e.home_participant,e.away_participant,e.event_status FROM selections s JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN event_matches em ON em.event_id=e.id WHERE m.event_id=ANY($1::bigint[]) ORDER BY s.id`, [scopedEventIds]);
  const allSelections: SourceSelection[] = selectionRows.rows.map((row) => ({ ...asMarkets([row])[0]!, canonicalEventId: matchedEvents.get(Number(row.event_id)) ?? 0, selectionId: Number(row.selection_id), selection: row.selection_name as string | null, line: row.line as string | null }));
  const marketById = new Map(matchedMarkets.map((market) => [market.id, market]));
  const candidates = allSelections.filter((selection) => marketById.has(selection.id));
  const grouped = new Map<string, Array<{ record: SourceSelection; market: SemanticMarket; selection: SemanticSelection }>>();
  for (const record of candidates) { const market = semanticMarket(record); const selection = semanticSelection(record, market); const key = `${record.canonicalEventId}\u0000${marketIdentity(market)}\u0000${selectionIdentity(selection)}`; grouped.set(key, [...(grouped.get(key) ?? []), { record, market, selection }]); }
  const matchedSelectionCanonical = new Map<number, { canonicalSelectionId: number; canonicalMarketId: number; sources: string[]; market: SemanticMarket; selection: SemanticSelection }>();
  for (const entries of grouped.values()) {
    const sources = unique(entries.map((entry) => entry.record.sportsbook)); const first = entries[0]!;
    if (sources.length < 2 || first.market.ambiguous || first.selection.ambiguous) continue;
    const marketId = await canonicalMarketId(client, first.record.canonicalEventId, first.market, cache); const selectionId = await canonicalSelectionId(client, marketId, first.selection, cache);
    for (const entry of entries) await client.query(`INSERT INTO market_aliases(source_namespace,alias_key,alias_name,family,type_key,subject_kind,period_key) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [sourceNamespace(entry.record.sportsbook), compact(entry.record.market), entry.record.market, entry.market.family, entry.market.typeKey, entry.market.subjectKind, entry.market.periodKey]);
    for (const entry of entries) matchedSelectionCanonical.set(entry.record.selectionId, { canonicalSelectionId: selectionId, canonicalMarketId: marketId, sources: sources.sort(), market: entry.market, selection: entry.selection });
  }
  const sourceMarketCanonical = new Map<number, { canonicalMarketId: number; sources: string[]; semantic: SemanticMarket }>();
  const selectionById = new Map(allSelections.map((selection) => [selection.selectionId, selection]));
  for (const [selectionId, match] of matchedSelectionCanonical) { const source = selectionById.get(selectionId)!; sourceMarketCanonical.set(source.id, { canonicalMarketId: match.canonicalMarketId, sources: match.sources, semantic: match.market }); }
  const selectionDecisions: Array<{ sourceId: number; decision: Decision }> = [];
  for (const selection of allSelections) {
    const match = matchedSelectionCanonical.get(selection.selectionId); const market = semanticMarket(selection); const semantic = semanticSelection(selection, market);
    if (match) selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: match.canonicalSelectionId, status: "MATCHED", method: "SEMANTIC_MARKET_SELECTION_LINE", confidence: 1, sources: match.sources, evidence: { canonicalMarket: marketIdentity(match.market), selection: selectionIdentity(match.selection), lifecycle: lifecycle(selection.status) } } });
    else if (!matchedEvents.has(selection.eventId)) selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: null, status: "UNMATCHED", method: "EVENT_NOT_MATCHED", confidence: 0, sources: [], evidence: {} } });
    else if (semantic.ambiguous) selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: null, status: "AMBIGUOUS", method: "INCOMPLETE_SEMANTIC_DIMENSIONS", confidence: 0, sources: [], evidence: { market: marketIdentity(market), selection: selectionIdentity(semantic) } } });
    else selectionDecisions.push({ sourceId: selection.selectionId, decision: { canonicalId: null, status: "UNMATCHED", method: "NO_EXACT_SEMANTIC_PEER", confidence: 0, sources: [], evidence: { market: marketIdentity(market), selection: selectionIdentity(semantic) } } });
  }
  await writeDecisionBatch(client, "selection", selectionDecisions);
  const marketDecisions: Array<{ sourceId: number; decision: Decision }> = [];
  for (const market of allMarkets) {
    const match = sourceMarketCanonical.get(market.id); const semantic = semanticMarket(market);
    if (match) marketDecisions.push({ sourceId: market.id, decision: { canonicalId: match.canonicalMarketId, status: "MATCHED", method: "SEMANTIC_MARKET_WITH_SELECTION_LINE", confidence: 1, sources: match.sources, evidence: { market: marketIdentity(match.semantic), lifecycle: lifecycle(market.status) } } });
    else if (!matchedEvents.has(market.eventId)) marketDecisions.push({ sourceId: market.id, decision: { canonicalId: null, status: "UNMATCHED", method: "EVENT_NOT_MATCHED", confidence: 0, sources: [], evidence: {} } });
    else if (semantic.ambiguous) marketDecisions.push({ sourceId: market.id, decision: { canonicalId: null, status: "AMBIGUOUS", method: "INCOMPLETE_SEMANTIC_DIMENSIONS", confidence: 0, sources: [], evidence: { market: marketIdentity(semantic) } } });
    else marketDecisions.push({ sourceId: market.id, decision: { canonicalId: null, status: "UNMATCHED", method: "NO_EXACT_SEMANTIC_SELECTION_PEER", confidence: 0, sources: [], evidence: { market: marketIdentity(semantic) } } });
  }
  await writeDecisionBatch(client, "market", marketDecisions);
}

/** Rebuilds decisions from source projections. It never mutates RAW or odds/event history. */
export async function reconcileMatching(client: PoolClient, options: { full?: boolean } = {}): Promise<void> {
  const pending = options.full ? null : new Set((await client.query(`SELECT event_id FROM matching_work_queue ORDER BY enqueued_at FOR UPDATE SKIP LOCKED`)).rows.map((row) => Number(row.event_id)));
  const processed = await reconcileEvents(client, pending);
  await reconcileMarketsAndSelections(client, processed);
  if (!options.full && pending && pending.size) await client.query(`DELETE FROM matching_work_queue WHERE event_id=ANY($1::bigint[])`, [[...pending]]);
}
```
COMANDO: ls -la src/changes
```text
total 40
drwxr-xr-x@  6 User  staff   192 Sep 30 10:57 .
drwxr-xr-x@ 27 User  staff   864 Sep 30 11:26 ..
-rw-r--r--@  1 User  staff  4580 Sep 26 18:03 cycles.ts
-rw-r--r--@  1 User  staff  3585 Sep 26 18:03 detector.ts
-rw-r--r--@  1 User  staff  1850 Sep 26 18:03 show.ts
-rw-r--r--@  1 User  staff  1464 Sep 26 18:03 store.ts
```
EXIT: 0
ARCHIVO: src/changes/cycles.ts
LÍNEAS: 70
```typescript
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sourceKey } from "../engine/memory.js";
import type { Source } from "../engine/types.js";
import type { ProviderRecord } from "../normalization/types.js";
import { extractPinnacleRecords } from "../network/pinnacle.js";
import { extractBetssonRecords } from "../network/betsson.js";
import type { CycleSummary } from "../scheduler/scheduler.js";
import { detectChanges } from "./detector.js";
import { ChangesStore } from "./store.js";

async function entries(folder: string): Promise<string[]> {
  try { return await readdir(folder); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
export async function readSnapshot(path: string): Promise<ProviderRecord[]> {
  const snapshot = JSON.parse(await readFile(path, "utf8"));
  const payload = snapshot.evidence?.payload;
  let records: ProviderRecord[];
  if (Array.isArray(payload?.records)) records = payload.records;
  else if (Array.isArray(payload?.captures) && snapshot.source?.type === "pinnacle") records = extractPinnacleRecords(payload.captures, snapshot.retrievedAt);
  else if (Array.isArray(payload?.captures) && snapshot.source?.type === "betsson") records = extractBetssonRecords(payload.captures, snapshot.retrievedAt);
  else throw new Error(`Snapshot has no supported complete record representation: ${path}`);
  if (records.length !== snapshot.recordCount) throw new Error(`Incomplete snapshot ${path}: recordCount=${snapshot.recordCount}, readable records=${records.length}`);
  return records;
}

export class CycleChanges {
  private readonly previous = new Map<string, string>();
  private readonly store: ChangesStore;
  constructor(private readonly root = ".engine", private readonly log: (line: string) => void = console.log) { this.store = new ChangesStore(root, log); }
  private async snapshot(source: Source, start: number, end: number): Promise<string | null> {
    const prefix = `${sourceKey(source)}-`;
    const files = (await entries(join(this.root, "raw"))).flatMap(file => {
      if (!file.startsWith(prefix)) return [];
      const match = /-(\d+)-(http|network|dom|accessibility|visual)\.json$/.exec(file);
      const timestamp = match ? Number(match[1]) : NaN;
      return timestamp >= start && timestamp <= end ? [{ file, timestamp }] : [];
    }).sort((a, b) => b.timestamp - a.timestamp);
    return files[0] ? join(this.root, "raw", files[0].file) : null;
  }
  private async previousCycle(source: Source, current: CycleSummary): Promise<string | null> {
    const folder = join(this.root, "scheduler");
    const cycles: CycleSummary[] = [];
    for (const date of await entries(folder)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      for (const file of await entries(join(folder, date))) if (file.endsWith(".json")) {
        const cycle = JSON.parse(await readFile(join(folder, date, file), "utf8")) as CycleSummary;
        if (cycle.finishedAt <= current.startedAt && cycle.results.some(result => result.status === "SUCCEEDED" && sourceKey(result.source) === sourceKey(source))) cycles.push(cycle);
      }
    }
    cycles.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
    return cycles[0] ? this.snapshot(source, Date.parse(cycles[0].startedAt), Date.parse(cycles[0].finishedAt)) : null;
  }
  async processCycle(cycle: CycleSummary): Promise<void> {
    for (const result of cycle.results) {
      if (result.status !== "SUCCEEDED") { this.log(`Changes skipped ${result.source.type}: ${result.status}`); continue; }
      try {
        const key = sourceKey(result.source);
        const currentSnapshot = await this.snapshot(result.source, Date.parse(cycle.startedAt), Date.parse(cycle.finishedAt));
        if (!currentSnapshot) throw new Error("No RAW snapshot generated within this cycle");
        const current = await readSnapshot(currentSnapshot);
        const previousSnapshot = this.previous.get(key) ?? await this.previousCycle(result.source, cycle);
        const detected = previousSnapshot ? detectChanges(await readSnapshot(previousSnapshot), current) : { changes: [], stats: { firstRun: true } as const };
        await this.store.save({ cycleId: cycle.cycleId, detectedAt: new Date().toISOString(), source: result.source, previousSnapshot, currentSnapshot, ...detected });
        this.previous.set(key, currentSnapshot);
      } catch (error) { this.log(`Change detection failed ${result.source.type}: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
}
```
ARCHIVO: src/changes/detector.ts
LÍNEAS: 50
```typescript
import type { ProviderRecord } from "../normalization/types.js";

export type ChangeStats = { compared: number; changed: number; new: number; removed: number; unchanged: number };
type Identity = {
  source: string; sourceEventId: string; sourceMarketId: string; sourceSelectionId: string;
  eventName: string | null; market: string | null; selection: string | null; bookmaker: string | null;
  previousOdds: string | null; currentOdds: string | null; previousDecimal: number | null; currentDecimal: number | null;
};
export type OddsChange = Identity & ({ kind: "odds_changed"; direction: "up" | "down"; magnitude: number } | { kind: "new_selection" | "removed_selection" });

function index(records: ProviderRecord[]): Map<string, ProviderRecord> {
  const result = new Map<string, ProviderRecord>();
  for (const record of records) {
    const fields = [record.sportsbook, record.sourceEventId, record.sourceMarketId, record.sourceSelectionId];
    if (fields.some(value => typeof value !== "string" || !value.trim())) throw new Error("Snapshot record lacks source or stable event/market/selection IDs");
    const key = JSON.stringify(fields);
    const previous = result.get(key);
    if (previous && (previous.decimalOdds !== record.decimalOdds || previous.rawOdds !== record.rawOdds)) throw new Error(`Conflicting duplicate selection key: ${key}`);
    result.set(key, record);
  }
  return result;
}
const decimal = (record?: ProviderRecord): number | null => typeof record?.decimalOdds === "number" && Number.isFinite(record.decimalOdds) ? record.decimalOdds : null;
function identity(previous: ProviderRecord | undefined, current: ProviderRecord | undefined): Identity {
  const record = current ?? previous!;
  return { source: record.sportsbook!, sourceEventId: record.sourceEventId!, sourceMarketId: record.sourceMarketId!, sourceSelectionId: record.sourceSelectionId!,
    eventName: record.eventName ?? null, market: record.market ?? null, selection: record.selection ?? null, bookmaker: record.bookmaker ?? null,
    previousOdds: previous?.rawOdds ?? null, currentOdds: current?.rawOdds ?? null, previousDecimal: decimal(previous), currentDecimal: decimal(current) };
}

export function detectChanges(previousRecords: ProviderRecord[], currentRecords: ProviderRecord[]): { changes: OddsChange[]; stats: ChangeStats } {
  const previous = index(previousRecords), current = index(currentRecords);
  const changes: OddsChange[] = [];
  const stats: ChangeStats = { compared: 0, changed: 0, new: 0, removed: 0, unchanged: 0 };
  for (const [key, record] of current) {
    const old = previous.get(key);
    if (!old) { changes.push({ kind: "new_selection", ...identity(undefined, record) }); stats.new++; continue; }
    stats.compared++;
    const before = decimal(old), after = decimal(record);
    if (before === null || after === null) throw new Error(`Cannot compare non-finite or missing decimalOdds for ${key}`);
    // Compare the threshold endpoint directly: 2.01 must qualify against 2,
    // despite binary subtraction yielding 0.009999999999999787. Magnitude stays unrounded.
    if (after !== before && (after >= before + 0.01 || before >= after + 0.01)) {
      changes.push({ kind: "odds_changed", ...identity(old, record), direction: after > before ? "up" : "down", magnitude: Math.abs(after - before) });
      stats.changed++;
    } else stats.unchanged++;
  }
  for (const [key, record] of previous) if (!current.has(key)) { changes.push({ kind: "removed_selection", ...identity(record, undefined) }); stats.removed++; }
  return { changes, stats };
}
```
ARCHIVO: src/changes/show.ts
LÍNEAS: 30
```typescript
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StoredChanges } from "./store.js";

export async function showChanges(date: string, root = ".engine", log: (line: string) => void = console.log): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("Date must be YYYY-MM-DD");
  const folder = join(root, "changes", date);
  const files = await readdir(folder).catch(error => { if (error.code === "ENOENT") return [] as string[]; throw error; });
  const events = new Map<string, number>(), markets = new Map<string, number>();
  let count = 0;
  for (const file of files.sort()) if (file.endsWith(".json")) {
    const data = JSON.parse(await readFile(join(folder, file), "utf8")) as StoredChanges;
    for (const change of data.changes) {
      count++;
      const event = change.eventName ?? "null", market = change.market ?? "null";
      events.set(event, (events.get(event) ?? 0) + 1); markets.set(market, (markets.get(market) ?? 0) + 1);
    }
  }
  log(`Changes ${date}: ${count}`);
  for (const [label, values, limit] of [["Top 10 events", events, 10], ["Top 5 markets", markets, 5]] as const) {
    log(label);
    for (const [name, total] of [...values].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)) log(`${total} | ${name}`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  await (args.length === 2 && args[0] === "--date" ? showChanges(args[1]!) : Promise.reject(new Error("Usage: npm run changes:show -- --date YYYY-MM-DD")))
    .catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
```
ARCHIVO: src/changes/store.ts
LÍNEAS: 23
```typescript
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sourceKey } from "../engine/memory.js";
import type { Source } from "../engine/types.js";
import type { ChangeStats, OddsChange } from "./detector.js";

export type StoredChanges = {
  cycleId: string; detectedAt: string; source: Source; previousSnapshot: string | null; currentSnapshot: string;
  stats: ChangeStats | { firstRun: true }; changes: OddsChange[];
};
export class ChangesStore {
  constructor(private readonly root = ".engine", private readonly log: (line: string) => void = console.log) {}
  async save(input: StoredChanges): Promise<string | null> {
    if (!("firstRun" in input.stats) && !input.changes.length) { this.log(`no changes detected: ${input.source.type}`); return null; }
    const folder = join(this.root, "changes", input.detectedAt.slice(0, 10));
    await mkdir(folder, { recursive: true });
    // Four sources can finish in the same second. Each source/cycle needs its own file.
    const path = join(folder, `${input.detectedAt.slice(11, 19).replace(/:/g, "-")}-${sourceKey(input.source)}-${input.cycleId}.json`);
    await writeFile(path, JSON.stringify(input, null, 2) + "\n", { flag: "wx" });
    this.log(`Changes ${input.source.type}: ${"firstRun" in input.stats ? "firstRun" : `odds_changed=${input.stats.changed} new_selection=${input.stats.new} removed_selection=${input.stats.removed}`} | ${path}`);
    return path;
  }
}
```
COMANDO: ls -la src/quality
```text
total 16
drwxr-xr-x@  3 User  staff    96 Sep 18 13:26 .
drwxr-xr-x@ 27 User  staff   864 Sep 30 11:26 ..
-rw-r--r--@  1 User  staff  4372 Sep 18 13:26 service.ts
```
EXIT: 0
ARCHIVO: src/quality/service.ts
LÍNEAS: 27
```typescript
import type { Pool } from 'pg';
import type { NormalizedRecord, RawPayloadInput } from '../normalization/types.js';
export type QualityFinding={source:string;code:'ZERO_RECORDS'|'MISSING_PRICE'|'SCHEMA_DRIFT'|'TIMESTAMP_REGRESSION';count:number;details:Record<string,unknown>};
export function inspectCollection(source:string, records:NormalizedRecord[], raw:RawPayloadInput[], previousNonempty=false):QualityFinding[] {
  const findings:QualityFinding[]=[];
  if(records.length===0 && previousNonempty) findings.push({source,code:'ZERO_RECORDS',count:1,details:{expected:'prior successful nonempty run'}});
  const missing=records.filter(r=>r.decimalOdds===null||r.decimalOdds<=1||!Number.isFinite(r.decimalOdds));
  if(missing.length) findings.push({source,code:'MISSING_PRICE',count:missing.length,details:{records:records.length}});
  const malformed=records.filter(r=>!r.sourceEventId||!r.market||!r.selection);
  const rawMalformed=raw.filter(r=>!r.sourceType||!r.parserVersion);
  if(malformed.length+rawMalformed.length) findings.push({source,code:'SCHEMA_DRIFT',count:malformed.length+rawMalformed.length,details:{normalized:malformed.length,raw:rawMalformed.length}});
  const regressions=records.filter(r=>r.providerTimestamp && Number.isFinite(Date.parse(r.providerTimestamp)) && Date.parse(r.providerTimestamp)>Date.parse(r.collectedAt)+60_000);
  if(regressions.length) findings.push({source,code:'TIMESTAMP_REGRESSION',count:regressions.length,details:{reason:'provider timestamp later than collection by >60s'}});
  return findings;
}
export class DataQualityService {
  constructor(private readonly pool:Pool){}
  async getSourceQuality(staleAfterMs=300_000):Promise<unknown[]> {
    const r=await this.pool.query(`WITH latest_health AS (SELECT DISTINCT ON(sportsbook) sportsbook,status,checked_at,message FROM source_health ORDER BY sportsbook,checked_at DESC),
      latest_run AS (SELECT DISTINCT ON(sportsbook) sportsbook,status,started_at,finished_at,records_seen FROM collector_runs WHERE status='SUCCEEDED' ORDER BY sportsbook,started_at DESC,id DESC),
      prices AS (SELECT CASE WHEN b.key LIKE 'actionnetwork-%' THEN 'actionnetwork' ELSE b.key END AS sportsbook,count(*)::int selections,count(*) FILTER(WHERE s.last_seen_at<now()-($1::text||' milliseconds')::interval OR s.last_seen_at IS NULL)::int stale_count,count(*) FILTER(WHERE o.decimal_odds IS NULL)::int missing_price_count,max(s.last_seen_at) AS newest_seen FROM selections s JOIN markets m ON m.id=s.market_id JOIN events e ON e.id=m.event_id JOIN sportsbooks b ON b.id=e.sportsbook_id LEFT JOIN LATERAL (SELECT decimal_odds FROM odds_observations WHERE selection_id=s.id ORDER BY observed_at DESC,id DESC LIMIT 1) o ON true WHERE (s.canonical_selection_id IS NULL OR s.canonical_selection_id=s.id) AND (e.event_start_time IS NULL OR e.event_start_time>=now()-interval '24 hours') GROUP BY CASE WHEN b.key LIKE 'actionnetwork-%' THEN 'actionnetwork' ELSE b.key END),
      anomalies AS (SELECT source,code,sum(count)::int count FROM quality_findings WHERE observed_at>now()-interval '24 hours' GROUP BY source,code)
      SELECT h.sportsbook,h.status AS transport_status,h.checked_at,h.message,r.status AS run_status,r.started_at,r.records_seen,p.selections,p.stale_count,p.missing_price_count,p.newest_seen,coalesce(jsonb_object_agg(a.code,a.count) FILTER(WHERE a.code IS NOT NULL),'{}'::jsonb) AS anomalies
      FROM latest_health h LEFT JOIN latest_run r USING(sportsbook) LEFT JOIN prices p ON p.sportsbook=h.sportsbook LEFT JOIN anomalies a ON a.source=h.sportsbook GROUP BY h.sportsbook,h.status,h.checked_at,h.message,r.status,r.started_at,r.records_seen,p.selections,p.stale_count,p.missing_price_count,p.newest_seen ORDER BY h.sportsbook`,[staleAfterMs]);
    return r.rows.map(row=>({...row,overall_status:row.transport_status!=='HEALTHY'||Date.now()-new Date(row.checked_at).getTime()>staleAfterMs?'DEGRADED':row.run_status==='FAILED'||row.stale_count>0||row.missing_price_count>0||Object.keys(row.anomalies).length?'DEGRADED':'HEALTHY',reasons:[row.transport_status!=='HEALTHY'?'transport':null,Date.now()-new Date(row.checked_at).getTime()>staleAfterMs?'health_check_stale':null,row.run_status==='FAILED'?'last_run_failed':null,row.stale_count>0?'stale_odds':null,row.missing_price_count>0?'missing_prices':null,...Object.keys(row.anomalies)].filter(Boolean)}));
  }
}
```
COMANDO: ls -la src/ml
```text
total 72
drwxr-xr-x@  8 User  staff    256 Sep 26 07:58 .
drwxr-xr-x@ 27 User  staff    864 Sep 30 11:26 ..
-rw-r--r--@  1 User  staff   3003 Sep 18 05:08 anomaly.ts
-rw-r--r--@  1 User  staff   4991 Sep 18 05:07 features.ts
-rw-r--r--@  1 User  staff   3882 Sep 18 05:14 models.ts
-rw-r--r--@  1 User  staff   1542 Sep 18 12:58 review.ts
-rw-r--r--@  1 User  staff  10359 Sep 18 12:57 service.ts
-rw-r--r--@  1 User  staff   2941 Sep 18 05:15 types.ts
```
EXIT: 0
ARCHIVO: src/ml/anomaly.ts
LÍNEAS: 7
```typescript
import type { NormalizedRecord } from "../normalization/types.js";
import { anomalyScore } from "./models.js";
import type { AnomalyFeatures, AnomalyFinding, AnomalyModelArtifact } from "./types.js";
export type HistoricalAnomalyContext = { previousOdds?: number | null; duplicateRate?: number; sourceDisagreement?: number };
const numeric = (value: string | null): number | null => { if (!value) return null; const parsed = Number(value.replace(/[^+\-0-9.]/g, "")); return Number.isFinite(parsed) ? parsed : null; };
export const anomalyFeatures = (record: NormalizedRecord, context: HistoricalAnomalyContext = {}): AnomalyFeatures => { const odds = record.decimalOdds; const line = numeric(record.line); const collected = Date.parse(record.collectedAt); const eventStart = record.eventStartTime ? Date.parse(record.eventStartTime) : NaN; const provider = record.providerTimestamp ? Date.parse(record.providerTimestamp) : NaN; return { invalid_odds: odds === null || !Number.isFinite(odds) || odds <= 1 ? 1 : 0, odds_log: odds && odds > 1 ? Math.min(10, Math.abs(Math.log(odds))) : 0, line_abs: line === null ? 0 : Math.min(1, Math.abs(line) / 100), event_time_gap: Number.isFinite(eventStart) && Number.isFinite(collected) ? Math.min(1, Math.abs(collected - eventStart) / (14 * 86_400_000)) : 0, provider_time_gap: Number.isFinite(provider) && Number.isFinite(collected) ? Math.min(1, Math.abs(collected - provider) / 86_400_000) : 0, price_move: odds && context.previousOdds && odds > 1 && context.previousOdds > 1 ? Math.min(1, Math.abs(Math.log(odds / context.previousOdds)) / 2) : 0, duplicate_rate: Math.min(1, context.duplicateRate ?? 0), source_disagreement: Math.min(1, context.sourceDisagreement ?? 0), schema_missing: [record.sourceEventId, record.market, record.selection, record.sport].filter((value) => !value).length / 4 }; };
export const findingFor = (record: NormalizedRecord, model: AnomalyModelArtifact, context: HistoricalAnomalyContext = {}, modelVersion: string | null = null): AnomalyFinding => { const features = anomalyFeatures(record, context); const score = anomalyScore(model, features); const reasons = Object.entries(features).filter(([, value]) => value > 0).sort(([, a], [, b]) => b - a).slice(0, 4).map(([key, value]) => `${key}=${value.toFixed(3)}`); const anomalyType = features.invalid_odds ? "odds_or_parsing" : features.price_move > 0.7 ? "extreme_movement" : features.provider_time_gap > 0.5 ? "timestamp" : features.duplicate_rate > 0.7 ? "duplicate" : features.source_disagreement > 0.5 ? "source_inconsistency" : features.schema_missing > 0 ? "schema_drift" : "multivariate_outlier"; return { entityKey: `${record.sportsbook ?? ""}|${record.sourceEventId ?? record.eventName ?? ""}|${record.sourceMarketId ?? record.market ?? ""}|${record.sourceSelectionId ?? record.selection ?? ""}|${record.collectedAt}`, observationAt: record.collectedAt, anomalyType, score, decision: score >= model.threshold ? "review" : "normal", reasons, features, modelVersion }; };
```
ARCHIVO: src/ml/features.ts
LÍNEAS: 30
```typescript
import type { NormalizedRecord } from "../normalization/types.js";
import type { MatchFeatures } from "./types.js";

export const normalizeLabel = (value: string | null | undefined): string => (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const tokens = (value: string | null | undefined): Set<string> => new Set(normalizeLabel(value).split(" ").filter(Boolean));
const jaccard = (a: Set<string>, b: Set<string>): number => { if (!a.size || !b.size) return 0; const intersection = [...a].filter((item) => b.has(item)).length; return intersection / new Set([...a, ...b]).size; };
const similarity = (a: string | null | undefined, b: string | null | undefined): number => {
  const left = normalizeLabel(a); const right = normalizeLabel(b); if (!left || !right) return 0; if (left === right) return 1;
  const tokenScore = jaccard(tokens(left), tokens(right)); const pairs = (value: string): Set<string> => new Set([...value].slice(0, -1).map((_, i) => value.slice(i, i + 2)));
  return Math.max(tokenScore, jaccard(pairs(left), pairs(right)));
};
const participantSimilarity = (a: NormalizedRecord, b: NormalizedRecord): { home: number; away: number; reversed: number; all: number } => {
  const home = similarity(a.homeParticipant, b.homeParticipant); const away = similarity(a.awayParticipant, b.awayParticipant);
  const reversed = (similarity(a.homeParticipant, b.awayParticipant) + similarity(a.awayParticipant, b.homeParticipant)) / 2;
  const left = (a.participants ?? [a.homeParticipant, a.awayParticipant]).filter((x): x is string => Boolean(x)); const right = (b.participants ?? [b.homeParticipant, b.awayParticipant]).filter((x): x is string => Boolean(x));
  return { home, away, reversed, all: jaccard(new Set(left.flatMap((x) => [...tokens(x)])), new Set(right.flatMap((x) => [...tokens(x)]))) };
};
const timeProximity = (a: string | null, b: string | null): number => { if (!a || !b) return 0; const delta = Math.abs(Date.parse(a) - Date.parse(b)) / 60_000; return Number.isFinite(delta) ? Math.max(0, 1 - Math.min(delta, 180) / 180) : 0; };
const lineValue = (value: string | null): number | null => { if (!value) return null; const parsed = Number(value.replace(/[^+\-0-9.]/g, "")); return Number.isFinite(parsed) ? parsed : null; };
const lineSimilarity = (a: string | null, b: string | null): number => { const left = lineValue(a); const right = lineValue(b); if (left === null || right === null) return similarity(a, b); return Math.max(0, 1 - Math.min(Math.abs(left - right), 10) / 10); };
const exact = (a: string | null, b: string | null): number => a && b && normalizeLabel(a) === normalizeLabel(b) ? 1 : 0;
export const matchFeatures = (a: NormalizedRecord, b: NormalizedRecord): MatchFeatures => { const p = participantSimilarity(a, b); return {
  sport_exact: exact(a.sport, b.sport), competition_similarity: similarity(a.competition, b.competition), event_name_similarity: similarity(a.eventName, b.eventName), home_similarity: p.home, away_similarity: p.away, reversed_participants_similarity: p.reversed, participants_similarity: p.all, start_time_proximity: timeProximity(a.eventStartTime, b.eventStartTime), market_similarity: similarity(a.market, b.market), period_similarity: similarity(a.marketPeriod, b.marketPeriod), player_similarity: similarity(a.participantPlayer, b.participantPlayer), selection_similarity: similarity(a.selection, b.selection), line_similarity: lineSimilarity(a.line, b.line), source_ids_present: a.sourceEventId && b.sourceEventId ? 1 : 0
}; };
export const exactDeterministicMatch = (a: NormalizedRecord, b: NormalizedRecord): boolean => {
  const required = [a.sport, b.sport, a.competition, b.competition, a.homeParticipant, b.homeParticipant, a.awayParticipant, b.awayParticipant, a.eventStartTime, b.eventStartTime, a.market, b.market, a.marketPeriod, b.marketPeriod, a.selection, b.selection, a.line, b.line];
  if (required.some((value) => value === null || value === undefined)) return false;
  return normalizeLabel(a.sport) === normalizeLabel(b.sport) && normalizeLabel(a.competition) === normalizeLabel(b.competition) && normalizeLabel(a.homeParticipant) === normalizeLabel(b.homeParticipant) && normalizeLabel(a.awayParticipant) === normalizeLabel(b.awayParticipant) && Date.parse(a.eventStartTime!) === Date.parse(b.eventStartTime!) && normalizeLabel(a.market) === normalizeLabel(b.market) && normalizeLabel(a.marketPeriod) === normalizeLabel(b.marketPeriod) && normalizeLabel(a.participantPlayer) === normalizeLabel(b.participantPlayer) && normalizeLabel(a.selection) === normalizeLabel(b.selection) && lineSimilarity(a.line, b.line) === 1;
};
export const featureReasons = (features: MatchFeatures): string[] => Object.entries(features).filter(([key]) => !["source_ids_present", "sport_exact"].includes(key)).sort(([, a], [, b]) => b - a).slice(0, 4).map(([key, value]) => `${key}=${value.toFixed(3)}`);
```
ARCHIVO: src/ml/models.ts
LÍNEAS: 15
```typescript
import { ANOMALY_FEATURE_NAMES, MATCH_FEATURE_NAMES, type AnomalyFeatures, type AnomalyModelArtifact, type BinaryMetrics, type LogisticModelArtifact, type MatchFeatures } from "./types.js";
import { matchFeatures } from "./features.js";
const sigmoid = (value: number): number => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
const safeRate = (a: number, b: number): number => b ? a / b : 0;
export const binaryMetrics = (labels: boolean[], predictions: boolean[], abstained = 0): BinaryMetrics => { let truePositive = 0; let falsePositive = 0; let trueNegative = 0; let falseNegative = 0; labels.forEach((label, i) => { const prediction = predictions[i] ?? false; if (label && prediction) truePositive++; else if (!label && prediction) falsePositive++; else if (!label) trueNegative++; else falseNegative++; }); const precision = safeRate(truePositive, truePositive + falsePositive); const recall = safeRate(truePositive, truePositive + falseNegative); return { precision, recall, f1: safeRate(2 * precision * recall, precision + recall), falsePositiveRate: safeRate(falsePositive, falsePositive + trueNegative), falseNegativeRate: safeRate(falseNegative, falseNegative + truePositive), confusionMatrix: { truePositive, falsePositive, trueNegative, falseNegative }, evaluated: labels.length, ...(abstained ? { abstained } : {}) }; };
export const fitLogistic = (rows: Array<{ features: MatchFeatures; label: boolean }>): LogisticModelArtifact | null => {
  if (rows.length < 4 || new Set(rows.map((row) => row.label)).size < 2) return null;
  const weights = Object.fromEntries(MATCH_FEATURE_NAMES.map((name) => [name, 0])) as Record<(typeof MATCH_FEATURE_NAMES)[number], number>; let bias = 0;
  for (let epoch = 0; epoch < 120; epoch++) { const gradient = Object.fromEntries(MATCH_FEATURE_NAMES.map((name) => [name, 0])) as typeof weights; let biasGradient = 0; for (const row of rows) { const prediction = sigmoid(bias + MATCH_FEATURE_NAMES.reduce((sum, name) => sum + row.features[name] * weights[name], 0)); const error = prediction - (row.label ? 1 : 0); biasGradient += error; MATCH_FEATURE_NAMES.forEach((name) => { gradient[name] += error * row.features[name]; }); } MATCH_FEATURE_NAMES.forEach((name) => { weights[name] -= 0.12 * (gradient[name] / rows.length + 0.015 * weights[name]); }); bias -= 0.12 * biasGradient / rows.length; }
  return { kind: "logistic_regression", featureVersion: "match-features-v1", weights, bias, threshold: 0.78, abstainBelow: 0.58 };
};
export const predictMatch = (model: LogisticModelArtifact, features: MatchFeatures): number => sigmoid(model.bias + MATCH_FEATURE_NAMES.reduce((sum, name) => sum + features[name] * model.weights[name], 0));
const median = (values: number[]): number => { const sorted = [...values].sort((a, b) => a - b); if (!sorted.length) return 0; const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2; };
export const fitRobustMad = (rows: AnomalyFeatures[]): AnomalyModelArtifact | null => { if (rows.length < 5) return null; const medians = Object.fromEntries(ANOMALY_FEATURE_NAMES.map((name) => [name, median(rows.map((row) => row[name]))])) as Record<(typeof ANOMALY_FEATURE_NAMES)[number], number>; const mads = Object.fromEntries(ANOMALY_FEATURE_NAMES.map((name) => [name, Math.max(0.000001, median(rows.map((row) => Math.abs(row[name] - medians[name]))))])) as Record<(typeof ANOMALY_FEATURE_NAMES)[number], number>; return { kind: "robust_mad", featureVersion: "anomaly-features-v1", medians, mads, threshold: 4.5 }; };
export const anomalyScore = (model: AnomalyModelArtifact, features: AnomalyFeatures): number => ANOMALY_FEATURE_NAMES.map((name) => Math.min(Math.abs(features[name] - model.medians[name]) / (1.4826 * model.mads[name]), 20)).reduce((sum, value) => sum + value, 0) / ANOMALY_FEATURE_NAMES.length;
```
ARCHIVO: src/ml/review.ts
LÍNEAS: 12
```typescript
import type { NormalizedRecord } from "../normalization/types.js";
import type { QualityFinding } from "../quality/service.js";

export type ReviewCaseType = "ambiguous_match" | "near_match" | "unmatched_cross_source_event" | "conflicting_match" | "deterministic_anomaly" | "correction_confirmed";
export type ReviewCaseStatus = "OPEN" | "CONFIRMED_MATCH" | "CONFIRMED_NON_MATCH" | "DISMISSED" | "CORRECTED";
export type ExperimentalReviewCase = { caseType: ReviewCaseType; source: string; leftRecord?: NormalizedRecord; rightRecord?: NormalizedRecord; evidence: Record<string, unknown>; datasetVersion: string };
export type ReviewRevision = { caseId: number; status: ReviewCaseStatus; groundTruthLabel?: boolean | null; correction?: Record<string, unknown> | null; reviewer?: string | null; reason?: string | null };

export const deterministicReviewCases = (source: string, records: NormalizedRecord[], findings: QualityFinding[], datasetVersion = "review-v1"): ExperimentalReviewCase[] => {
  const cases: ExperimentalReviewCase[] = findings.map((finding) => ({ caseType: "deterministic_anomaly", source, evidence: { code: finding.code, count: finding.count, details: finding.details, labelsMustBeHumanConfirmed: true }, datasetVersion }));
  return [...cases, ...records.filter((record) => !record.sourceEventId || !record.market || !record.selection).map((record) => ({ caseType: "deterministic_anomaly" as const, source, leftRecord: record, evidence: { code: "SCHEMA_DRIFT", labelsMustBeHumanConfirmed: true }, datasetVersion }))];
};
```
ARCHIVO: src/ml/service.ts
LÍNEAS: 42
```typescript
import { createHash } from "node:crypto";
import type { NormalizedRecord } from "../normalization/types.js";
import { anomalyFeatures, findingFor } from "./anomaly.js";
import { exactDeterministicMatch, featureReasons, matchFeatures } from "./features.js";
import { anomalyScore, binaryMetrics, fitLogistic, fitRobustMad, predictMatch } from "./models.js";
import type { AnomalyDatasetRow, AnomalyFinding, AnomalyModelArtifact, BinaryMetrics, LogisticModelArtifact, MatchAssist, MatchDatasetRow, MlTrainingReport } from "./types.js";
import type { ExperimentalReviewCase, ReviewCaseStatus, ReviewRevision } from "./review.js";

export type MlRepository = { loadMatchDataset(): Promise<MatchDatasetRow[]>; loadAnomalyDataset(): Promise<AnomalyDatasetRow[]>; getLatestMlRun(): Promise<{ modelVersion: string; matchModel: LogisticModelArtifact | null; anomalyModel: AnomalyModelArtifact | null; report: MlTrainingReport } | null>; saveMlRun(input: { report: MlTrainingReport; matchModel: LogisticModelArtifact | null; anomalyModel: AnomalyModelArtifact | null }): Promise<void>; saveMlAnalysis(analysis: { matches: MatchAssist[]; anomalies: AnomalyFinding[] }): Promise<void>; getMlAssists(limit: number): Promise<MatchAssist[]>; getMlAnomalies(limit: number): Promise<AnomalyFinding[]>; saveReviewCases(cases: ExperimentalReviewCase[]): Promise<void>; getReviewCases(limit: number, status?: ReviewCaseStatus): Promise<unknown[]>; reviewCase(input: ReviewRevision): Promise<void> };
const pairLabel = (row: MatchDatasetRow): boolean => exactDeterministicMatch(row.left, row.right);
const versionHash = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12);
const splitRows = (rows: MatchDatasetRow[]): { train: MatchDatasetRow[]; validation: MatchDatasetRow[]; test: MatchDatasetRow[] } => {
  const parent = new Map<string, string>(); const find = (key: string): string => { const current = parent.get(key); if (!current) { parent.set(key, key); return key; } if (current === key) return key; const root = find(current); parent.set(key, root); return root; }; const union = (left: string, right: string): void => { const a = find(left); const b = find(right); if (a !== b) parent.set(a, b); }; rows.forEach((row) => union(row.leftEventKey, row.rightEventKey));
  const groups = new Map<string, MatchDatasetRow[]>(); rows.forEach((row) => { const key = find(row.leftEventKey); const group = groups.get(key) ?? []; group.push(row); groups.set(key, group); }); const ordered = [...groups.values()].sort((a, b) => Date.parse(a.at(-1)!.observedAt) - Date.parse(b.at(-1)!.observedAt)); const trainEnd = Math.floor(ordered.length * 0.6); const validationEnd = Math.max(trainEnd, Math.floor(ordered.length * 0.8)); return { train: ordered.slice(0, trainEnd).flat(), validation: ordered.slice(trainEnd, validationEnd).flat(), test: ordered.slice(validationEnd).flat() };
};
const evalMatch = (model: LogisticModelArtifact | null, rows: MatchDatasetRow[]): BinaryMetrics => { if (!model || !rows.length) return binaryMetrics([], []); const labels = rows.map(pairLabel); const predictions = rows.map((row) => predictMatch(model, matchFeatures(row.left, row.right)) >= model.threshold); const abstained = rows.filter((row) => { const score = predictMatch(model, matchFeatures(row.left, row.right)); return score < model.threshold && score >= model.abstainBelow; }).length; return binaryMetrics(labels, predictions, abstained); };
const evalBaseline = (rows: MatchDatasetRow[]): BinaryMetrics => binaryMetrics(rows.map(pairLabel), rows.map((row) => exactDeterministicMatch(row.left, row.right)));
const splitAnomalyRows = (rows: AnomalyDatasetRow[]): { train: AnomalyDatasetRow[]; test: AnomalyDatasetRow[] } => { const groups = new Map<string, AnomalyDatasetRow[]>(); rows.forEach((row) => { const key = `${row.record.sportsbook ?? ""}|${row.record.sourceEventId ?? row.record.eventName ?? ""}`; groups.set(key, [...(groups.get(key) ?? []), row]); }); const ordered = [...groups.values()].sort((a, b) => Date.parse(a.at(-1)!.observedAt) - Date.parse(b.at(-1)!.observedAt)); const trainEnd = Math.floor(ordered.length * 0.6); const testStart = Math.floor(ordered.length * 0.8); return { train: ordered.slice(0, trainEnd).flat(), test: ordered.slice(testStart).flat() }; };

export class MlService {
  constructor(private readonly repository: MlRepository) {}
  async train(): Promise<MlTrainingReport> {
    const rows = await this.repository.loadMatchDataset(); const splits = splitRows(rows); const matchModel = fitLogistic(splits.train.map((row) => ({ features: matchFeatures(row.left, row.right), label: pairLabel(row) })));
    const anomalyRows = await this.repository.loadAnomalyDataset(); const anomalySplits = splitAnomalyRows(anomalyRows); const anomalyFeatureRows = anomalySplits.train.map((row) => anomalyFeatures(row.record, { previousOdds: row.previousOdds, duplicateRate: row.duplicateRate, sourceDisagreement: row.sourceDisagreement })); const anomalyModel = fitRobustMad(anomalyFeatureRows);
    const trainingDate = new Date().toISOString(); const datasetVersion = `postgres-${versionHash({ match: rows.length, anomaly: anomalyRows.length, lastMatch: rows.at(-1)?.observedAt ?? null, lastAnomaly: anomalyRows.at(-1)?.observedAt ?? null })}`; const featureVersion = "match-features-v1+anomaly-features-v1"; const modelVersion = `ml-${trainingDate.slice(0, 10)}-${versionHash({ datasetVersion, featureVersion, trainingDate })}`;
    let anomalyMetrics: BinaryMetrics | null = null; if (anomalyModel) anomalyMetrics = binaryMetrics(anomalySplits.test.map((row) => row.knownAnomaly), anomalySplits.test.map((row) => anomalyScore(anomalyModel, anomalyFeatures(row.record, { previousOdds: row.previousOdds, duplicateRate: row.duplicateRate, sourceDisagreement: row.sourceDisagreement })) >= anomalyModel.threshold));
    const matchingMetrics = evalMatch(matchModel, splits.test); const deterministicBaseline = evalBaseline(splits.test); const matchingIntegration = matchModel && matchingMetrics.f1 >= deterministicBaseline.f1 && matchingMetrics.falsePositiveRate <= deterministicBaseline.falsePositiveRate && matchingMetrics.falseNegativeRate <= deterministicBaseline.falseNegativeRate ? "enabled" : "abstain_baseline_better";
    const report: MlTrainingReport = { datasetVersion, featureVersion, modelVersion, trainingDate, datasetSize: rows.length, trainCount: splits.train.length, validationCount: splits.validation.length, testCount: splits.test.length, matchingMetrics, deterministicBaseline, matchingIntegration, anomalyDatasetSize: anomalyRows.length, anomalyMetrics, status: matchModel || anomalyModel ? "READY" : "ABSTAIN" }; await this.repository.saveMlRun({ report, matchModel, anomalyModel });
    if (anomalyModel) { const review = anomalyRows.map((row) => findingFor(row.record, anomalyModel!, { previousOdds: row.previousOdds, duplicateRate: row.duplicateRate, sourceDisagreement: row.sourceDisagreement }, modelVersion)).filter((finding) => finding.decision === "review"); await this.repository.saveMlAnalysis({ matches: [], anomalies: review }); }
    return report;
  }
  async analyze(records: NormalizedRecord[]): Promise<{ matches: MatchAssist[]; anomalies: AnomalyFinding[] }> {
    const latest = await this.repository.getLatestMlRun(); if (!latest) return { matches: [], anomalies: [] }; const matches: MatchAssist[] = []; const effectiveMatchModel = latest.report.matchingIntegration === "enabled" ? latest.matchModel : null; const candidates = effectiveMatchModel ? await this.repository.loadMatchDataset() : [];
    for (const record of records) for (const candidate of candidates) { const other = candidate.left.sportsbook === record.sportsbook ? candidate.right : candidate.right.sportsbook === record.sportsbook ? candidate.left : null; if (!other) continue; const features = matchFeatures(record, other); const deterministic = exactDeterministicMatch(record, other); const confidence = deterministic ? 1 : effectiveMatchModel ? predictMatch(effectiveMatchModel, features) : 0; const decision = deterministic ? "deterministic_exact" : effectiveMatchModel && confidence >= effectiveMatchModel.threshold ? "ml_match" : "abstain"; if (decision !== "abstain" || confidence >= (effectiveMatchModel?.abstainBelow ?? 0.58)) matches.push({ pairKey: `${record.sourceEventId ?? record.eventName}|${other.sourceEventId ?? other.eventName}|${record.sourceMarketId ?? record.market}|${other.sourceMarketId ?? other.market}`, decision, confidence, reasons: deterministic ? ["all deterministic identity fields agree"] : featureReasons(features), features, modelVersion: effectiveMatchModel ? latest.modelVersion : null }); }
    const uniqueMatches = [...new Map(matches.map((item) => [item.pairKey, item])).values()].sort((a, b) => b.confidence - a.confidence).slice(0, 200); const anomalyHistory = latest.anomalyModel ? await this.repository.loadAnomalyDataset() : []; const anomalies: AnomalyFinding[] = latest.anomalyModel ? records.map((record) => { const prior = anomalyHistory.filter((row) => row.record.sportsbook === record.sportsbook && row.record.sourceEventId === record.sourceEventId && row.record.sourceMarketId === record.sourceMarketId && row.record.sourceSelectionId === record.sourceSelectionId).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0]; return findingFor(record, latest.anomalyModel!, prior ? { previousOdds: prior.record.decimalOdds, duplicateRate: prior.duplicateRate, sourceDisagreement: prior.sourceDisagreement } : {}, latest.modelVersion); }) : []; const result = { matches: uniqueMatches, anomalies }; await this.repository.saveMlAnalysis(result); return result;
  }
  async status(): Promise<unknown> { return { mode: "EXPERIMENTAL", activeInProduction: false, decisionMode: "NOT_ACTIVE_IN_PRODUCTION", trainingMode: "MANUAL_ONLY", latest: await this.repository.getLatestMlRun() }; }
  async assists(limit = 100): Promise<MatchAssist[]> { return this.repository.getMlAssists(limit); }
  async anomalies(limit = 100): Promise<AnomalyFinding[]> { return this.repository.getMlAnomalies(limit); }
  async reviewCases(limit = 100, status?: ReviewCaseStatus): Promise<unknown[]> { return this.repository.getReviewCases(limit, status); }
  async reviewCase(input: ReviewRevision): Promise<void> { return this.repository.reviewCase(input); }
}
```
ARCHIVO: src/ml/types.ts
LÍNEAS: 20
```typescript
import type { NormalizedRecord } from "../normalization/types.js";

export const MATCH_FEATURE_NAMES = [
  "sport_exact", "competition_similarity", "event_name_similarity", "home_similarity", "away_similarity",
  "reversed_participants_similarity", "participants_similarity", "start_time_proximity", "market_similarity",
  "period_similarity", "player_similarity", "selection_similarity", "line_similarity", "source_ids_present"
] as const;
export type MatchFeatureName = (typeof MATCH_FEATURE_NAMES)[number];
export type MatchFeatures = Record<MatchFeatureName, number>;
export type MatchDatasetRow = { pairKey: string; leftEventKey: string; rightEventKey: string; observedAt: string; left: NormalizedRecord; right: NormalizedRecord };
export type MatchAssist = { pairKey: string; decision: "deterministic_exact" | "ml_match" | "abstain"; confidence: number; reasons: string[]; features: MatchFeatures; modelVersion: string | null };
export type BinaryMetrics = { precision: number; recall: number; f1: number; falsePositiveRate: number; falseNegativeRate: number; confusionMatrix: { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number }; evaluated: number; abstained?: number };
export type LogisticModelArtifact = { kind: "logistic_regression"; featureVersion: string; weights: Record<MatchFeatureName, number>; bias: number; threshold: number; abstainBelow: number };
export type AnomalyFeatureName = "invalid_odds" | "odds_log" | "line_abs" | "event_time_gap" | "provider_time_gap" | "price_move" | "duplicate_rate" | "source_disagreement" | "schema_missing";
export const ANOMALY_FEATURE_NAMES: readonly AnomalyFeatureName[] = ["invalid_odds", "odds_log", "line_abs", "event_time_gap", "provider_time_gap", "price_move", "duplicate_rate", "source_disagreement", "schema_missing"];
export type AnomalyFeatures = Record<AnomalyFeatureName, number>;
export type AnomalyModelArtifact = { kind: "robust_mad"; featureVersion: string; medians: Record<AnomalyFeatureName, number>; mads: Record<AnomalyFeatureName, number>; threshold: number };
export type AnomalyFinding = { entityKey: string; observationAt: string; anomalyType: string; score: number; decision: "review" | "normal"; reasons: string[]; features: AnomalyFeatures; modelVersion: string | null };
export type AnomalyDatasetRow = { observationId: number; observedAt: string; record: NormalizedRecord; previousOdds: number | null; duplicateRate: number; sourceDisagreement: number; knownAnomaly: boolean };
export type MlTrainingReport = { datasetVersion: string; featureVersion: string; modelVersion: string; trainingDate: string; datasetSize: number; trainCount: number; validationCount: number; testCount: number; matchingMetrics: BinaryMetrics; deterministicBaseline: BinaryMetrics; matchingIntegration: "enabled" | "abstain_baseline_better"; anomalyDatasetSize: number; anomalyMetrics: BinaryMetrics | null; status: "READY" | "ABSTAIN" };
```
COMANDO: ls -la src/scheduler
```text
total 24
drwxr-xr-x@  4 User  staff   128 Sep 30 10:57 .
drwxr-xr-x@ 27 User  staff   864 Sep 30 11:26 ..
-rw-r--r--@  1 User  staff  2384 Sep 26 17:35 main.ts
-rw-r--r--@  1 User  staff  7141 Sep 26 18:03 scheduler.ts
```
EXIT: 0
ARCHIVO: src/scheduler/main.ts
LÍNEAS: 43
```typescript
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogSources } from "../batch.js";
import { loadSourceCatalog } from "../sources/registry.js";
import type { Source, SourceMemory } from "../engine/types.js";
import { schedule, type ScheduleOptions } from "./scheduler.js";

const activeTypes = ["bestfightodds", "fightodds", "pinnacle", "betsson"];

/** Catalogue identity plus the URLs already verified by this engine, without editing either. */
export async function loadActiveSources(dataDir = ".engine"): Promise<Source[]> {
  const catalog = catalogSources(await loadSourceCatalog());
  const verified = new Map<string, SourceMemory>();
  const folder = join(dataDir, "memory");
  for (const file of await readdir(folder)) {
    if (!file.endsWith(".json")) continue;
    const memory = JSON.parse(await readFile(join(folder, file), "utf8")) as SourceMemory;
    if (!activeTypes.includes(memory.source?.type) || !memory.lastSuccessAt) continue;
    const previous = verified.get(memory.source.type);
    if (!previous || memory.lastSuccessAt > previous.lastSuccessAt!) verified.set(memory.source.type, memory);
  }
  return activeTypes.map(type => {
    const source = verified.get(type)?.source ?? catalog.find(source => source.type === type);
    if (!source) throw new Error(`No registered or previously verified source for ${type}`);
    return { ...source };
  });
}

async function main(): Promise<void> {
  const options: Partial<ScheduleOptions> = {};
  const fields = { "--interval-minutes": "intervalMinutes", "--per-source-timeout-ms": "perSourceTimeoutMs", "--delay-ms": "delayBetweenSourcesMs" } as const;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i] as keyof typeof fields;
    if (!(name in fields) || args[i + 1] === undefined) throw new Error("Usage: npm run engine:schedule -- [--interval-minutes N] [--per-source-timeout-ms N] [--delay-ms N]");
    options[fields[name]] = Number(args[i + 1]);
  }
  await schedule({ ...options, sources: await loadActiveSources() }).completion;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
```
ARCHIVO: src/scheduler/scheduler.ts
LÍNEAS: 122
```typescript
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { EventEmitter } from "node:events";
import { executeSource, type BatchResult, type BatchSummary } from "../batch.js";
import type { AcquisitionOutcome, Source } from "../engine/types.js";
import { CycleChanges } from "../changes/cycles.js";

export type CycleSummary = BatchSummary & { cycleId: string; intervalMinutes: number };
export type ScheduleOptions = {
  sources: Source[];
  intervalMinutes?: number;
  perSourceTimeoutMs?: number;
  delayBetweenSourcesMs?: number;
  onCycleComplete?: (summary: CycleSummary) => void | Promise<void>;
};
export type SchedulerDependencies = {
  dataDir?: string;
  log?: (line: string) => void;
  signals?: Pick<EventEmitter, "on" | "off">;
  /** Tests may inject a cancellable engine invocation; production uses the isolated batch worker. */
  runEngine?: (source: Source, signal: AbortSignal) => Promise<AcquisitionOutcome>;
};
const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

async function invokeMockEngine(source: Source, timeoutMs: number, run: NonNullable<SchedulerDependencies["runEngine"]>): Promise<BatchResult> {
  const started = Date.now();
  const cancellation = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const task = Promise.resolve().then(() => run(source, cancellation.signal)).then(async outcome => {
    if (outcome.status === "PAUSED") await outcome.close();
    if (timedOut) return null;
    if (outcome.status === "SUCCEEDED") return { source, status: outcome.status, method: outcome.method, recordCount: outcome.records.length };
    if (outcome.status === "PAUSED") return { source, status: outcome.status, method: outcome.event.method, recordCount: 0, reason: outcome.event.reason };
    return { source, status: outcome.status, method: outcome.attempts.at(-1)?.method ?? null, recordCount: 0, reason: outcome.reason };
  });
  try {
    const result = await Promise.race([task, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { timedOut = true; cancellation.abort(); reject(new Error(`Global source timeout after ${timeoutMs} ms`)); }, timeoutMs);
    })]);
    if (!result) throw new Error("Source cancelled");
    return { ...result, durationMs: Date.now() - started };
  } finally { clearTimeout(timer); }
}

/** Serial cycles, with the configured interval measured from completion of each cycle. */
export function schedule(options: ScheduleOptions, dependencies: SchedulerDependencies = {}): { stop: () => void; completion: Promise<void> } {
  const sources = options.sources.map(source => ({ ...source }));
  const intervalMinutes = options.intervalMinutes ?? 15;
  const intervalMs = intervalMinutes * 60_000;
  const timeoutMs = options.perSourceTimeoutMs ?? 180_000;
  const delayMs = options.delayBetweenSourcesMs ?? 2_000;
  if (!sources.length) throw new Error("Scheduler requires at least one source");
  if (!Number.isFinite(intervalMs) || intervalMs < 1 || intervalMs > 2_147_483_647) throw new Error("Interval must be between 1 and 2147483647 ms");
  for (const [name, value, minimum] of [["perSourceTimeoutMs", timeoutMs, 1], ["delayBetweenSourcesMs", delayMs, 0]] as const)
    if (!Number.isSafeInteger(value) || value < minimum || value > 2_147_483_647) throw new Error(`${name} must be an integer between ${minimum} and 2147483647`);
  const dataDir = dependencies.dataDir ?? ".engine";
  const log = dependencies.log ?? console.log;
  const changes = new CycleChanges(dataDir, log);
  const signals = dependencies.signals ?? process;
  const idle = new AbortController();
  let stopping = false;
  const stop = (): void => {
    if (stopping) return;
    stopping = true;
    log("Stopping scheduler...");
    idle.abort();
  };
  signals.on("SIGINT", stop);
  log(`Scheduler started. Interval: ${intervalMinutes} min. Sources: ${sources.length}.`);
  const completion = (async () => {
    try {
      while (!stopping) {
        const started = Date.now();
        const results: BatchResult[] = [];
        for (const [index, source] of sources.entries()) {
          if (index) await delay(delayMs);
          const sourceStarted = Date.now();
          try {
            results.push(dependencies.runEngine
              ? await invokeMockEngine(source, timeoutMs, dependencies.runEngine)
              : await executeSource(source, timeoutMs, dataDir));
          } catch (error) {
            results.push({ source, status: "FAILED", method: null, recordCount: 0, durationMs: Date.now() - sourceStarted, reason: message(error) });
          }
        }
        const finished = Date.now();
        const summary: CycleSummary = {
          cycleId: randomUUID(), startedAt: new Date(started).toISOString(), finishedAt: new Date(finished).toISOString(),
          durationMs: finished - started, intervalMinutes, results,
          totals: { attempted: results.length, succeeded: results.filter(r => r.status === "SUCCEEDED").length,
            failed: results.filter(r => r.status === "FAILED").length, paused: results.filter(r => r.status === "PAUSED").length,
            totalRecords: results.reduce((sum, r) => sum + r.recordCount, 0) }
        };
        const directory = join(dataDir, "scheduler", summary.startedAt.slice(0, 10));
        let path = join(directory, `${summary.startedAt.slice(11, 19).replace(/:/g, "-")}.json`);
        try {
          await mkdir(directory, { recursive: true });
          const body = JSON.stringify(summary, null, 2) + "\n";
          try { await writeFile(path, body, { flag: "wx" }); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
            path = path.replace(/\.json$/, `-${summary.cycleId}.json`);
            await writeFile(path, body, { flag: "wx" });
          }
          log(`Cycle ${summary.cycleId}`);
          for (const result of results) log(`${result.status} ${result.source.url} | method=${result.method ?? "none"} records=${result.recordCount} duration=${result.durationMs} ms${result.reason ? ` | ${result.reason.replace(/\r?\n/g, " ")}` : ""}`);
          log(`Attempted: ${summary.totals.attempted}; succeeded: ${summary.totals.succeeded}; failed: ${summary.totals.failed}; paused: ${summary.totals.paused}; total records: ${summary.totals.totalRecords}`);
          log(`Summary: ${path}`);
        } catch (error) { log(`Cycle persistence failed: ${message(error)}`); }
        try { await changes.processCycle(summary); }
        catch (error) { log(`Change detection failed: ${message(error)}`); }
        try { await options.onCycleComplete?.(summary); }
        catch (error) { log(`onCycleComplete failed: ${message(error)}`); }
        if (!stopping) await delay(intervalMs, undefined, { signal: idle.signal }).catch(error => { if (!idle.signal.aborted) throw error; });
      }
    } finally { signals.off("SIGINT", stop); }
  })();
  return { stop, completion };
}
```
COMANDO: cat src/storage.ts
```text
cat: src/storage.ts: No such file or directory
```
EXIT: 1
BLOQUE 3 — FALLO
COMANDO: cat src/storage.ts
SALIDA:
```text
cat: src/storage.ts: No such file or directory
```
EXIT: 1
COMANDO: cat src/types.ts
```text
cat: src/types.ts: No such file or directory
```
EXIT: 1
BLOQUE 3 — FALLO
COMANDO: cat src/types.ts
SALIDA:
```text
cat: src/types.ts: No such file or directory
```
EXIT: 1
COMANDO: ls -la src/types/
```text
ls: src/types/: No such file or directory
```
EXIT: 1
BLOQUE 3 — FALLO
COMANDO: ls -la src/types/
SALIDA:
```text
ls: src/types/: No such file or directory
```
EXIT: 1
ARCHIVO: src/network/betb2b.ts
LÍNEAS: 207
```typescript
import type { ProviderRecord } from "../normalization/types.js";

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const string = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const id = (value: unknown): string | null => typeof value === "number" && Number.isSafeInteger(value) ? String(value) : string(value);
const list = (value: unknown): JsonObject[] => Array.isArray(value) ? value.map(object).filter((entry): entry is JsonObject => entry !== null) : [];

/**
 * BetB2B regional feed settings. A future 22bet adapter can reuse this parser
 * with its own baseUrl, fcountry (country), gr (feed grouping), and ref (site
 * reference). These values are explicit because they vary by integration.
 */
export type BetB2BOptions = {
  baseUrl: string;
  sportsbook: string;
  profileVersion: string;
  fcountry: string;
  gr: string;
  ref: string;
  lng?: string;
  cfView?: string;
};
export type BetB2BCapture = { url: string; status: number; contentType: string | null; body: string; payload: unknown; mode: "line" | "live" };
export type BetB2BDictionary = { url: string; type: string; status: number; payload: unknown };

export function betB2BEndpoint(options: BetB2BOptions, mode: "line" | "live"): string {
  const url = new URL(`/service-api/main-${mode}-feed/v3/expressDay`, options.baseUrl);
  url.search = new URLSearchParams({ cfView: options.cfView ?? "3", fcountry: options.fcountry, gr: options.gr, lng: options.lng ?? "en", ref: options.ref }).toString();
  return url.href;
}

export async function fetchBetB2BFeeds(options: BetB2BOptions, timeoutMs = 20_000): Promise<BetB2BCapture[]> {
  return Promise.all((["line", "live"] as const).map(async (mode) => {
    const response = await fetch(betB2BEndpoint(options, mode), { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body); } catch { /* Retain body for diagnostics. */ }
    return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload, mode };
  }));
}

export async function fetchBetB2BDictionaries(options: BetB2BOptions, captures: BetB2BCapture[], timeoutMs = 20_000): Promise<Map<string, BetB2BDictionary>> {
  const types = new Set<string>();
  for (const capture of captures) for (const block of list(capture.payload)) {
    for (const entry of list(block.events)) {
      const type = id(object(entry.event)?.type);
      if (type) types.add(type);
    }
  }
  const results = await Promise.all([...types].map(async (type): Promise<BetB2BDictionary> => {
    const url = new URL(`/genfiles/cms/betstemplates/bets_model_short_en_${type}.json`, options.baseUrl).href;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      const body = await response.text();
      let payload: unknown = null;
      if (response.ok) try { payload = JSON.parse(body); } catch { /* Missing or invalid dictionary. */ }
      return { url: response.url, type, status: response.status, payload };
    } catch { return { url, type, status: 0, payload: null }; }
  }));
  return new Map(results.map((item) => [item.type, item]));
}

function dictionaryLabels(dictionary: unknown, type: string, groupId: string | null): { market: string | null; selection: string | null } {
  const root = object(dictionary);
  const own = object(root?.[type]);
  if (!own) return { market: null, selection: null };
  // A dictionary may name a market directly or nest it under a group. Never
  // select an unrelated group's label merely because its file exists.
  const group = groupId ? object(own[groupId]) : null;
  const selection = string(object(group?.M)?.[type] && object(object(group?.M)?.[type])?.N);
  return { market: string(group?.N) ?? string(own.N), selection };
}

function opponentId(value: unknown): string | null {
  return id(list(object(value)?.opps)[0]?.id);
}

/** Each priced element in a block is one selection. Unpriced summaries are skipped. */
export function extractBetB2BRecords(captures: BetB2BCapture[], dictionaries: Map<string, BetB2BDictionary>, options: BetB2BOptions, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records = new Map<string, ProviderRecord>();
  for (const capture of captures) {
    if (capture.status < 200 || capture.status >= 300) continue;
    for (const block of list(capture.payload)) {
      for (const entry of list(block.events)) {
        const event = object(entry.event);
        const eventId = id(entry.id);
        const sport = object(entry.sport), liga = object(entry.liga);
        const home = object(entry.opponent1), away = object(entry.opponent2);
        const homeName = string(home?.fullName), awayName = string(away?.fullName);
        const homeId = opponentId(home), awayId = opponentId(away);
        if (!eventId || !homeName || !awayName) continue;
        const startTs = typeof entry.startTs === "number" && Number.isSafeInteger(entry.startTs) ? entry.startTs : null;
        const start = startTs === null ? null : new Date(startTs * 1_000);
        const emit = (quote: JsonObject | null, groupId: string | null, nested: boolean): void => {
          const type = id(quote?.type);
          const rawOdds = typeof quote?.cf === "number" || typeof quote?.cf === "string" ? String(quote.cf) : null;
          const decimalOdds = rawOdds === null ? NaN : Number(rawOdds);
          if (!type || !rawOdds || !Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) return;
          const sourceSelectionId = `${type}:${homeId ?? "unknown"}:${awayId ?? "unknown"}`;
          const key = JSON.stringify([eventId, type, sourceSelectionId]);
          if (records.has(key)) return;
          const labels = dictionaryLabels(dictionaries.get(type)?.payload, type, groupId);
          const selection = labels.selection ?? (nested ? `type_${type}` : type === "1" ? homeName : type === "3" ? awayName : type === "2" ? "X" : `type_${type}`);
          records.set(key, {
            sportsbook: options.sportsbook, bookmaker: options.sportsbook,
            sport: string(sport?.name), competition: string(liga?.name),
            eventName: `${homeName} v ${awayName}`, participants: [homeName, awayName],
            homeParticipant: homeName, awayParticipant: awayName,
            eventStartTime: start && !Number.isNaN(start.valueOf()) ? start.toISOString() : null,
            eventStatus: capture.mode === "live" ? "live" : "prematch",
            market: labels.market ?? `type_${type}`, marketPeriod: null,
            selection, line: quote?.parameter === undefined || quote.parameter === null ? null : String(quote.parameter),
            decimalOdds, rawOdds, rawOddsFormat: "decimal",
            sourceEventId: eventId, sourceMarketId: type, sourceSelectionId,
            sourceUrl: capture.url, providerTimestamp: null, collectedAt,
            qualifiers: {
              extraction: "network", profileVersion: options.profileVersion,
              marketId: `${options.sportsbook}_type_${type}`,
              ...(id(sport?.id) ? { sportId: id(sport?.id)! } : {}),
              ...(id(liga?.id) ? { ligaId: id(liga?.id)! } : {}),
              ...(homeId ? { opponent1Id: homeId } : {}),
              ...(awayId ? { opponent2Id: awayId } : {}),
              ...(groupId ? { groupId } : {})
            }
          });
        };
        emit(event, id(event?.groupId), false);
        for (const group of list(entry.eventGroups)) {
          if (!Array.isArray(group.events)) continue;
          for (const subArray of group.events) {
            for (const quote of list(subArray)) emit(quote, id(group.groupId), true);
          }
        }
      }
    }
  }
  return [...records.values()];
}

/** Legacy BetB2B Get1x2_VZip uses country/partner rather than fcountry/ref. */
export function betB2B22Endpoint(options: BetB2BOptions, mode: "line" | "live"): string {
  const path = mode === "line" ? "/service-api/LineFeed/Get1x2_VZip" : "/service-api/LiveFeed/Get1x2_VZip";
  const url = new URL(path, options.baseUrl);
  url.search = new URLSearchParams(mode === "line"
    ? { count: "1000", lng: "en_GB", tz: "7", mode: "4", country: options.fcountry, partner: options.ref, gr: options.gr }
    : { count: "1000", lng: "en_GB", gr: options.gr, mode: "4", country: options.fcountry, partner: options.ref }).toString();
  return url.href;
}

export async function fetchBetB2B22Feeds(options: BetB2BOptions, timeoutMs = 20_000): Promise<BetB2BCapture[]> {
  return Promise.all((["line", "live"] as const).map(async (mode) => {
    const response = await fetch(betB2B22Endpoint(options, mode), { signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body); } catch { /* Retain body for diagnostics. */ }
    return { url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload, mode };
  }));
}

/** One record per priced E[] entry in the abbreviated Get1x2_VZip dialect. */
export function extractBetB2B22Records(captures: BetB2BCapture[], options: BetB2BOptions, collectedAt = new Date().toISOString()): ProviderRecord[] {
  const records: ProviderRecord[] = [];
  for (const capture of captures) {
    if (capture.status < 200 || capture.status >= 300) continue;
    const root = object(capture.payload);
    if (!root || root.Success === false) continue;
    for (const event of list(root.Value)) {
      const eventId = id(event.I), homeName = string(event.O1), awayName = string(event.O2);
      if (!eventId || !homeName || !awayName) continue;
      const homeId = id(event.O1I), awayId = id(event.O2I);
      const startTs = typeof event.S === "number" && Number.isSafeInteger(event.S) ? event.S : null;
      const start = startTs === null ? null : new Date(startTs * 1_000);
      for (const quote of list(event.E)) {
        const type = id(quote.T);
        const decimalOdds = typeof quote.C === "number" ? quote.C : Number(quote.C);
        if (!type || !Number.isFinite(decimalOdds) || decimalOdds <= 1 || decimalOdds >= 10_000) continue;
        const rawOdds = string(quote.CV) ?? String(quote.C);
        const groupId = id(quote.G);
        records.push({
          sportsbook: options.sportsbook, bookmaker: options.sportsbook,
          sport: string(event.SN), competition: string(event.L),
          eventName: `${homeName} v ${awayName}`, participants: [homeName, awayName],
          homeParticipant: homeName, awayParticipant: awayName,
          eventStartTime: start && !Number.isNaN(start.valueOf()) ? start.toISOString() : null,
          eventStatus: capture.mode === "live" ? "live" : "prematch",
          market: `type_${type}`, marketPeriod: null, selection: `type_${type}`,
          line: quote.P === undefined || quote.P === null ? null : String(quote.P),
          decimalOdds, rawOdds, rawOddsFormat: "decimal",
          sourceEventId: eventId, sourceMarketId: type,
          sourceSelectionId: `${type}:${homeId ?? "unknown"}:${awayId ?? "unknown"}`,
          sourceUrl: capture.url, providerTimestamp: null, collectedAt,
          qualifiers: {
            extraction: "network", profileVersion: options.profileVersion,
            marketId: `${options.sportsbook}_type_${type}`,
            ...(id(event.SI) ? { sportId: id(event.SI)! } : {}),
            ...(id(event.LI) ? { ligaId: id(event.LI)! } : {}),
            ...(homeId ? { opponent1Id: homeId } : {}),
            ...(awayId ? { opponent2Id: awayId } : {}),
            ...(groupId ? { groupId } : {})
          }
        });
      }
    }
  }
  return records;
}
```
ARCHIVO: src/network/bet9ja.ts
LÍNEAS: 122
```typescript
import type { ProviderRecord } from "../normalization/types.js";

export const BET9JA_NETWORK_PROFILE_VERSION = "bet9ja-feapi-v1";
const BASE = "https://sports.bet9ja.com";
const CACHE_VERSION = "1.328.0.248";
export const BET9JA_ENDPOINTS = {
  sports: `${BASE}/desktop/feapi/PalimpsestAjax/GetSports?DISP=0&v_cache_version=${CACHE_VERSION}`,
  prematch: `${BASE}/desktop/feapi/PalimpsestAjax/GetEventsInDailyBundleV3?DISP=1000&DISPH=0&SPORTID=1&LIMIT=10&v_cache_version=${CACHE_VERSION}`,
  live: `${BASE}/desktop/feapi/PalimpsestLiveAjax/GetLiveEventsV3?v_cache_version=${CACHE_VERSION}`,
} as const;

export type Bet9jaFeed = {
  mode: "sports" | "prematch" | "live";
  url: string;
  status: number;
  contentType: string | null;
  body: string;
  payload: unknown;
};

export async function fetchBet9jaFeeds(timeoutMs = 20_000): Promise<Bet9jaFeed[]> {
  return Promise.all((Object.entries(BET9JA_ENDPOINTS) as Array<[Bet9jaFeed["mode"], string]>).map(async ([mode, url]) => {
    const response = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    let payload: unknown = null;
    try { payload = JSON.parse(body) as unknown; } catch { /* Keep the HTTP response for engine diagnostics. */ }
    return { mode, url: response.url, status: response.status, contentType: response.headers.get("content-type"), body, payload };
  }));
}

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const string = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : null;
const entries = (value: unknown): Array<[string, unknown]> => Object.entries(object(value) ?? {});
const field = (record: Record<string, unknown> | null, key: string): string | null => string(record?.[key]);

function marketFor(selectionId: string, markets: Map<string, Record<string, unknown>>): {
  id: string; label: string; line: string | null; code: string;
} | null {
  for (const [id, market] of markets) {
    if (!selectionId.startsWith(`${id}_`) && !selectionId.startsWith(`${id}@`)) continue;
    const tail = selectionId.slice(id.length);
    const separator = tail.indexOf("_");
    if (separator < 0) continue;
    const line = tail.startsWith("@") ? tail.slice(1, separator) : null;
    const code = tail.slice(separator + 1);
    if (!code) continue;
    return { id, label: field(market, "NAME") ?? field(market, "M_LABEL") ?? id, line, code };
  }
  return null;
}

function selectionName(translations: Record<string, unknown> | null, selectionId: string, marketId: string, code: string): string {
  const full = translations?.[`M#${selectionId}`];
  const base = translations?.[`M#${marketId}_${code}`];
  return string(full) ?? field(object(full), "NAME") ?? string(base) ?? field(object(base), "NAME") ?? code;
}

function participants(name: string): { home: string | null; away: string | null; pair: string[] | null } {
  const parts = name.split(" - ");
  if (parts.length !== 2 || !parts[0]?.trim() || !parts[1]?.trim()) return { home: null, away: null, pair: null };
  return { home: parts[0], away: parts[1], pair: parts };
}

export function extractBet9jaRecords(feeds: Array<Pick<Bet9jaFeed, "mode" | "url" | "payload">>): ProviderRecord[] {
  const catalogue = object(object(feeds.find(feed => feed.mode === "sports")?.payload)?.D);
  const sports = object(catalogue?.PAL);
  const rows: ProviderRecord[] = [];
  const collectedAt = new Date().toISOString();

  for (const feed of feeds) {
    if (feed.mode === "sports") continue;
    const data = object(object(feed.payload)?.D);
    if (!data) continue;
    const marketValues = feed.mode === "prematch" ? (Array.isArray(data.MK) ? data.MK : []) : Object.values(object(data.MK) ?? {});
    const markets = new Map(marketValues.map(value => object(value)).filter((value): value is Record<string, unknown> => Boolean(value))
      .map(value => [string(value.ID), value] as const).filter((item): item is [string, Record<string, unknown>] => item[0] !== null)
      .sort((left, right) => right[0].length - left[0].length));
    const translations = object(data.TRANS);
    const groups = object(data.G);
    const liveSports = object(data.S);
    const eventValues = Array.isArray(data.E) ? data.E : Object.values(object(data.E) ?? {});
    const prematchSportId = feed.mode === "prematch" ? new URL(feed.url).searchParams.get("SPORTID") : null;

    for (const value of eventValues) {
      const event = object(value);
      if (!event) continue;
      const eventId = field(event, "ID");
      const eventName = field(event, feed.mode === "prematch" ? "N" : "DS");
      if (!eventId || !eventName) continue;
      const group = object(groups?.[field(event, "GID") ?? ""]);
      const sportId = feed.mode === "prematch" ? prematchSportId : field(event, "SID");
      const sport = feed.mode === "prematch" ? field(object(sports?.[sportId ?? ""]), "S_DESC")
        : field(object(liveSports?.[sportId ?? ""]), "S_DESC") ?? field(group, "SPORT");
      const competition = feed.mode === "prematch" ? field(group, "N") : field(group, "CATEGORY");
      const start = field(event, feed.mode === "prematch" ? "D" : "STARTDATEUTC");
      const sides = participants(eventName);
      const odds = feed.mode === "prematch" ? object(event.O) : object(object(event.EOD)?.OD);

      for (const [selectionId, quoteValue] of entries(odds)) {
        const market = marketFor(selectionId, markets);
        if (!market) continue;
        const raw = feed.mode === "prematch" ? string(quoteValue) : string(object(quoteValue)?.v);
        const decimal = raw === null ? NaN : Number(raw);
        if (!Number.isFinite(decimal) || decimal <= 1 || decimal >= 10_000) continue;
        rows.push({
          sportsbook: "bet9ja", sport, competition, eventName,
          participants: sides.pair, homeParticipant: sides.home, awayParticipant: sides.away,
          eventStartTime: start, eventStatus: feed.mode === "live" ? "live" : "prematch",
          market: market.label, selection: selectionName(translations, selectionId, market.id, market.code),
          line: market.line, decimalOdds: decimal, rawOdds: raw, rawOddsFormat: "decimal",
          sourceEventId: eventId, sourceMarketId: market.id, sourceSelectionId: selectionId,
          sourceUrl: feed.url, collectedAt,
          qualifiers: Object.fromEntries([["sportId", sportId], ["groupId", field(event, "GID")], ["externalId", field(event, "EXTID")]]
            .filter((item): item is [string, string] => item[1] !== null)),
        });
      }
    }
  }
  return [...new Map(rows.map(row => [`${row.sourceEventId}|${row.sourceMarketId}|${row.sourceSelectionId}`, row])).values()];
}
```
# BLOQUE 4 — ESTADO DE COMPILACIÓN Y TESTS
COMANDO: npm run typecheck ; echo "EXIT: $?"
```text

> personal-sportsbook-collector-core@0.1.0 typecheck
> tsc --noEmit

EXIT: 0
```
EXIT: 0
COMANDO: npm test 2>&1 | tail -100 ; echo "EXIT: $?"
```text
  ...
# Subtest: network discovery classifies an observed sports feed and emits verified generic records
ok 65 - network discovery classifies an observed sports feed and emits verified generic records
  ---
  duration_ms: 3.156625
  ...
# Subtest: network discovery observes fetch traffic, saves bounded RAW and normalizes only complete records
ok 66 - network discovery observes fetch traffic, saves bounded RAW and normalizes only complete records
  ---
  duration_ms: 511.872875
  ...
# Subtest: PostgreSQL migrations, leases, batching, canonical entities and SQL pagination
ok 67 - PostgreSQL migrations, leases, batching, canonical entities and SQL pagination # SKIP
  ---
  duration_ms: 0.459584
  ...
# Subtest: recognises decimal, American and fractional odds without treating scores as prices
ok 68 - recognises decimal, American and fractional odds without treating scores as prices
  ---
  duration_ms: 1.244959
  ...
# Subtest: reconstructs rendered event card and nested market with dynamic classes absent
ok 69 - reconstructs rendered event card and nested market with dynamic classes absent
  ---
  duration_ms: 3.518375
  ...
# Subtest: retains ambiguity and refuses an unassociated price
ok 70 - retains ambiguity and refuses an unassociated price
  ---
  duration_ms: 0.278333
  ...
# Subtest: deduplicates repeated virtualized cards and preserves bounded DOM RAW evidence
ok 71 - deduplicates repeated virtualized cards and preserves bounded DOM RAW evidence
  ---
  duration_ms: 1.6175
  ...
# Subtest: missing fields and malformed DOM remain non-fatal
ok 72 - missing fields and malformed DOM remain non-fatal
  ---
  duration_ms: 0.196708
  ...
# Subtest: scheduler immediately visits every source in order
ok 73 - scheduler immediately visits every source in order
  ---
  duration_ms: 12.838625
  ...
# Subtest: FAILED outcomes and thrown errors never interrupt the cycle
ok 74 - FAILED outcomes and thrown errors never interrupt the cycle
  ---
  duration_ms: 8.095125
  ...
# Subtest: PAUSED closes its browser and proceeds without human input
ok 75 - PAUSED closes its browser and proceeds without human input
  ---
  duration_ms: 7.772542
  ...
# Subtest: scheduler waits the interval after cycle completion
ok 76 - scheduler waits the interval after cycle completion
  ---
  duration_ms: 45.22675
  ...
# Subtest: cycles never overlap when a source takes longer than the interval
ok 77 - cycles never overlap when a source takes longer than the interval
  ---
  duration_ms: 93.326708
  ...
# Subtest: SIGINT finishes the current cycle and removes its signal listener
ok 78 - SIGINT finishes the current cycle and removes its signal listener
  ---
  duration_ms: 21.380917
  ...
# Subtest: source timeout cancels that invocation and continues with the next source
ok 79 - source timeout cancels that invocation and continues with the next source
  ---
  duration_ms: 23.454708
  ...
# Subtest: cycle JSON contains exact metrics without full records
ok 80 - cycle JSON contains exact metrics without full records
  ---
  duration_ms: 21.442042
  ...
# Subtest: SIGINT wakes the idle scheduler immediately without starting another cycle
ok 81 - SIGINT wakes the idle scheduler immediately without starting another cycle
  ---
  duration_ms: 8.533125
  ...
# Subtest: master source catalogue preserves every supplied URL relation
ok 82 - master source catalogue preserves every supplied URL relation
  ---
  duration_ms: 5.09475
  ...
1..82
# tests 82
# suites 0
# pass 81
# fail 0
# cancelled 0
# skipped 1
# todo 0
# duration_ms 5251.382167
EXIT: 0
```
EXIT: 0
COMANDO: cat package.json
```text
{
  "name": "personal-sportsbook-collector-core",
  "version": "0.1.0",
  "private": true,
  "description": "Autonomous core for a private sportsbook market collector.",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc",
    "test": "node --import tsx --test tests/**/*.test.ts",
    "migrations": "node scripts/migrate.mjs",
    "cli": "tsx src/cli.ts",
    "engine": "tsx src/engine/main.ts",
    "engine:batch": "tsx src/batch.ts",
    "engine:schedule": "tsx src/scheduler/main.ts",
    "changes:show": "tsx src/changes/show.ts",
    "ui": "tsx src/ui/main.ts",
    "start": "node dist/src/main.js",
    "dev": "tsx watch src/main.ts"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.2",
    "@supabase/ssr": "^0.12.7",
    "@supabase/supabase-js": "^2.116.0",
    "fastify": "^5.2.1",
    "pg": "^8.13.1",
    "playwright": "^1.51.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/pg": "^8.11.10",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```
EXIT: 0
# BLOQUE 5 — SCHEMA REAL DE UN RAW POR BACKEND
BACKEND: Kambi
RAW: .engine/raw/497d3df91e07c66b32f88e6daf25245838fe89def144f92a6f61b063accc980e-1790512978557-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[0].payload.events
EVENTO_MUESTRA:
```json
{
  "event": {
    "id": 1026752375,
    "name": "Sudáfrica - Australia",
    "nameDelimiter": "-",
    "englishName": "South Africa - Australia",
    "homeName": "Sudáfrica",
    "awayName": "Australia",
    "start": "2026-09-27T07:58:00Z",
    "group": "Encuentros",
    "groupId": 2000125174,
    "path": [
      {
        "id": 1000093178,
        "name": "Críquet",
        "englishName": "Cricket",
        "termKey": "cricket"
      },
      {
        "id": 2000085728,
        "name": "Partido internacional de un día",
        "englishName": "International One Day",
        "termKey": "international_one_day"
      },
      {
        "id": 2000125174,
        "name": "Encuentros",
        "englishName": "Matches",
        "termKey": "matches"
      }
    ],
    "nonLiveBoCount": 7,
    "liveBoCount": 10,
    "sport": "CRICKET",
    "tags": [
      "OPEN_FOR_LIVE",
      "STREAMED_WEB",
      "STREAMED_MOBILE",
      "MATCH"
    ],
    "state": "STARTED",
    "extraInfo": "2nd ODI"
  },
  "betOffers": [
    {
      "id": 2696194157,
      "criterion": {
        "id": 1001214599,
        "label": "Cuotas del partido",
        "englishLabel": "Match Odds",
        "order": []
      },
      "betOfferType": {
        "id": 2,
        "name": "Partido",
        "englishName": "Match"
      },
      "eventId": 1026752375,
      "outcomes": [
        {
          "id": 4349695457,
          "label": "1",
          "englishLabel": "1",
          "odds": 1300,
          "participant": "Sudáfrica",
          "type": "OT_ONE",
          "betOfferId": 2696194157,
          "changedDate": "2026-09-27T12:42:25Z",
          "participantId": 1000038701,
          "oddsFractional": "3/10",
          "oddsAmerican": "-335",
          "status": "OPEN",
          "cashOutStatus": "ENABLED",
          "displayOrder": 0
        },
        {
          "id": 4349695458,
          "label": "2",
          "englishLabel": "2",
          "odds": 3250,
          "participant": "Australia",
          "type": "OT_TWO",
          "betOfferId": 2696194157,
          "changedDate": "2026-09-27T12:42:25Z",
          "participantId": 1001737780,
          "oddsFractional": "9/4",
          "oddsAmerican": "225",
          "status": "OPEN",
          "cashOutStatus": "ENABLED",
          "displayOrder": 1
        }
      ],
      "tags": [
        "OFFERED_PREMATCH",
        "OFFERED_LIVE",
        "PBA_DISABLED",
        "MAIN"
      ],
      "cashOutStatus": "ENABLED"
    }
  ],
  "liveData": {
    "eventId": 1026752375,
    "score": {
      "home": "0",
      "away": "5",
      "info": "SA: 365 - 9. AUS require 361 to win from 49.0 overs.",
      "who": "UNKNOWN",
      "version": 1790512940922
    },
    "liveStatistics": []
  }
}
```
PATH_LOCAL: evidence.payload.captures[0].payload.events[0].event.homeName
PATH_VISITANTE: evidence.payload.captures[0].payload.events[0].event.awayName
PATH_FECHA: evidence.payload.captures[0].payload.events[0].event.start
PATH_ODDS: evidence.payload.captures[0].payload.events[0].betOffers[0].outcomes[0].odds
PATH_LIGA: evidence.payload.captures[0].payload.events[0].event.group
BACKEND: Altenar
RAW: .engine/raw/7877b4a1342a3ed01ee6a9d184d201aa3c0ebfd6457fcdc6398de253c111ea5d-1790505209364-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[0].payload.events
EVENTO_MUESTRA:
```json
{
  "score": [],
  "marketIds": [
    1743292123
  ],
  "isBooked": true,
  "isParlay": false,
  "offers": [
    {
      "type": 0,
      "parameter": 2
    },
    {
      "type": 2
    },
    {
      "type": 5
    },
    {
      "type": 6
    }
  ],
  "code": 6418,
  "hasStream": false,
  "extId": "fp32_ar:match:651941",
  "sc": 6719,
  "mc": 351,
  "rc": false,
  "pId": 32,
  "et": 0,
  "hasStats": false,
  "competitorIds": [
    50928,
    50927
  ],
  "sportId": 66,
  "catId": 560,
  "champId": 10009,
  "status": 0,
  "startDate": "2026-09-27T18:00:00Z",
  "id": 17642051,
  "name": "Pumas UNAM vs. Atletico San Luis"
}
```
PATH_LOCAL: evidence.payload.captures[0].payload.competitors[0].name (join competitorIds[0]=50928)
PATH_VISITANTE: evidence.payload.captures[0].payload.competitors[1].name (join competitorIds[1]=50927)
PATH_FECHA: evidence.payload.captures[0].payload.events[0].startDate
PATH_ODDS: evidence.payload.captures[0].payload.odds[0].price (join marketIds[0] → markets[0].oddIds[0])
PATH_LIGA: evidence.payload.captures[0].payload.champs[0].name (join champId=10009)
BACKEND: BetB2B expressDay
RAW: .engine/raw/da4ac8abe5ab2d5a386eba2e46b481d0ea4c2b04ea72594d07cf6e252925c103-1790658353562-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[0].payload[0].events
EVENTO_MUESTRA:
```json
{
  "sport": {
    "timeName": "innings",
    "timesName": "innings",
    "id": 66,
    "name": "Cricket"
  },
  "liga": {
    "countryImage": "/sfiles/logo-flag/55308e59c550429455d6957d5acc884d.png",
    "id": 3096741,
    "name": "Canada. Super Peel League"
  },
  "opponent1": {
    "fullName": "Mississauga Royals",
    "countryId": 85,
    "opps": [
      {
        "id": 7785491,
        "name": "Mississauga Royals",
        "image": "98a7b89ec2b0b99925119c628d2110c5.png"
      }
    ]
  },
  "opponent2": {
    "fullName": "City View Royals",
    "countryId": 85,
    "opps": [
      {
        "id": 6647457,
        "name": "City View Royals",
        "image": "3bd1ce62626ea99967a1eb45ec84de19.png"
      }
    ]
  },
  "event": {
    "groupId": 2804,
    "shortGroupId": 980,
    "type": 3752,
    "cf": 1.9,
    "cfView": "1.9"
  },
  "id": 756756753,
  "num": 175030,
  "mainGameId": 756756753,
  "constId": 374189086,
  "startTs": 1790707800,
  "countryId": 85,
  "gameTypeName": "",
  "periodName": "",
  "menuSection": 2,
  "mainConstId": 374189086,
  "kind": 3,
  "subscriptionAvailable": true,
  "isFavoriteAvailable": true
}
```
PATH_LOCAL: evidence.payload.captures[0].payload[0].events[0].opponent1.fullName
PATH_VISITANTE: evidence.payload.captures[0].payload[0].events[0].opponent2.fullName
PATH_FECHA: evidence.payload.captures[0].payload[0].events[0].startTs
PATH_ODDS: evidence.payload.captures[0].payload[0].events[0].event.cf
PATH_LIGA: evidence.payload.captures[0].payload[0].events[0].liga.name
BACKEND: BetB2B Value[].E[]
RAW: .engine/raw/4d9056c25203a016956012fe16a66f694b7b8599154340ffa99ba3593d35a9ab-1790665357178-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[0].payload.Value
EVENTO_MUESTRA:
```json
{
  "B": 82732,
  "IG": true,
  "WP": {
    "P1": 0.4,
    "P2": 0.58,
    "PX": 0.02
  },
  "I": 756941346,
  "N": 188343,
  "CI": 374417986,
  "E": [
    {
      "T": 402,
      "C": 1.571,
      "CV": "1.571",
      "G": 101
    },
    {
      "T": 3,
      "C": 1.574,
      "CV": "1.574",
      "G": 1
    },
    {
      "T": 401,
      "C": 2.3,
      "CV": "2.3",
      "G": 101
    },
    {
      "T": 1,
      "C": 2.306,
      "CV": "2.306",
      "G": 1
    },
    {
      "T": 2,
      "C": 50,
      "CV": "50",
      "G": 1
    }
  ],
  "AE": [],
  "EC": 15,
  "TG": "",
  "PN": "",
  "TN": "innings",
  "HSI": true,
  "SSI": 0,
  "S": 1790748000,
  "O1": "Oman",
  "O2": "Kerala",
  "O1I": 208399,
  "O2I": 553397,
  "O1IS": [
    208399
  ],
  "O2IS": [
    553397
  ],
  "O1C": 140,
  "O2C": 71,
  "O1IMG": [
    "208399.png"
  ],
  "O2IMG": [
    "c182aaba23a38ebbc57bf6f975aac9e9.png"
  ],
  "O1R": "Оман",
  "O2R": "Керала",
  "O1E": "Oman",
  "O2E": "Kerala",
  "MIS": [
    {
      "K": 2,
      "V": "Oman Cricket Academy Ground (Al Amarat)"
    },
    {
      "K": 3,
      "V": "ODI"
    },
    {
      "K": 9,
      "V": "+33°C"
    },
    {
      "K": 11,
      "V": "Oman"
    },
    {
      "K": 20,
      "V": "15"
    },
    {
      "K": 21,
      "V": "Clear skies"
    },
    {
      "K": 22,
      "V": "8"
    },
    {
      "K": 23,
      "V": "5.3"
    },
    {
      "K": 24,
      "V": "SSE wind, m/s"
    },
    {
      "K": 25,
      "V": "759"
    },
    {
      "K": 26,
      "V": "Pressure, mmHg"
    },
    {
      "K": 27,
      "V": "46"
    },
    {
      "K": 28,
      "V": "Humidity, %"
    },
    {
      "K": 35,
      "V": "0"
    },
    {
      "K": 36,
      "V": "Precipitation, %"
    }
  ],
  "MIO": {
    "Loc": "Oman Cricket Academy Ground (Al Amarat)",
    "MaF": "ODI"
  },
  "SI": 66,
  "SN": "Cricket",
  "SR": "Крикет",
  "SE": "Cricket",
  "L": "Oman. Tri-Series",
  "LR": "Оман. Три-Сириес",
  "LE": "Oman. Tri-Series",
  "LI": 3090805,
  "CN": "Oman",
  "COI": 140,
  "MS": [
    0
  ],
  "KI": 3,
  "CID": 1,
  "SmI": 38333,
  "TNS": "innings",
  "SUBA": true
}
```
PATH_LOCAL: evidence.payload.captures[0].payload.Value[0].O1
PATH_VISITANTE: evidence.payload.captures[0].payload.Value[0].O2
PATH_FECHA: evidence.payload.captures[0].payload.Value[0].S
PATH_ODDS: evidence.payload.captures[0].payload.Value[0].E[0].C
PATH_LIGA: evidence.payload.captures[0].payload.Value[0].L
BACKEND: Pinnacle
RAW: .engine/raw/18193dfdf3dd4a2dff8146f336f98541faf16e66cdc3ed044b589e86eeb5755d-1790466890729-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[0].payload
EVENTO_MUESTRA:
```json
{
  "ageLimit": 0,
  "altTeaser": false,
  "featureOrder": -1,
  "hasAltSpread": true,
  "hasAltTotal": true,
  "hasBetshare": false,
  "hasLive": true,
  "hasMarkets": false,
  "id": 1636532701,
  "isBetshareEnabled": false,
  "isFeatured": false,
  "isHighlighted": true,
  "isLive": false,
  "isPromoted": false,
  "league": {
    "ageLimit": 0,
    "featureOrder": 2,
    "group": "World",
    "id": 2117,
    "isFeatured": true,
    "isHidden": false,
    "isPromoted": false,
    "isSticky": false,
    "matchupCount": 36,
    "matchupCountSE": 36,
    "name": "International - Friendlies",
    "sequence": 8,
    "sport": {
      "featureOrder": 0,
      "id": 29,
      "isFeatured": true,
      "isHidden": false,
      "isSticky": false,
      "matchupCount": 1187,
      "matchupCountSE": 1182,
      "name": "Soccer",
      "primaryMarketType": "moneyline"
    }
  },
  "liveMode": null,
  "markets": [
    {
      "cutoffAt": "2026-09-26T23:00:00+00:00",
      "isAlternate": false,
      "key": "s;0;m",
      "limits": [
        {
          "amount": 2250,
          "type": "maxRiskStake"
        }
      ],
      "matchupId": 1636532701,
      "period": 0,
      "prices": [
        {
          "designation": "home",
          "price": -153
        },
        {
          "designation": "away",
          "price": 423
        },
        {
          "designation": "draw",
          "price": 286
        }
      ],
      "status": "open",
      "type": "moneyline",
      "version": 3743584206
    }
  ],
  "parent": null,
  "parentId": null,
  "parlayRestriction": "unique_matchups",
  "participants": [
    {
      "alignment": "home",
      "name": "Canada",
      "order": 0,
      "state": {
        "corners": 1,
        "score": 1,
        "yellowCards": 0
      },
      "stats": [
        {
          "period": 0
        },
        {
          "period": 1
        }
      ]
    },
    {
      "alignment": "away",
      "name": "Chile",
      "order": 1,
      "state": {
        "corners": 1,
        "score": 0,
        "yellowCards": 0
      },
      "stats": [
        {
          "period": 0
        },
        {
          "period": 1
        }
      ]
    }
  ],
  "periods": [
    {
      "cutoffAt": "2026-09-26T23:00:00Z",
      "hasMoneyline": true,
      "hasSpread": true,
      "hasTeamTotal": true,
      "hasTotal": true,
      "period": 0,
      "status": "open"
    },
    {
      "cutoffAt": "2026-09-26T23:00:00Z",
      "hasMoneyline": true,
      "hasSpread": true,
      "hasTeamTotal": true,
      "hasTotal": true,
      "period": 1,
      "status": "open"
    }
  ],
  "rotation": 23576,
  "startTime": "2026-09-26T23:00:00Z",
  "state": {},
  "status": "pending",
  "totalMarketCount": 80,
  "type": "matchup",
  "units": "Regular",
  "version": 702999353
}
```
PATH_LOCAL: evidence.payload.captures[0].payload[1].participants[0].name
PATH_VISITANTE: evidence.payload.captures[0].payload[1].participants[1].name
PATH_FECHA: evidence.payload.captures[0].payload[1].startTime
PATH_ODDS: evidence.payload.captures[0].payload[1].markets[0].prices[0].price
PATH_LIGA: evidence.payload.captures[0].payload[1].league.name
BACKEND: Betsson
RAW: .engine/raw/063f207bc19e86d43aa463af75ab48211ffaf33f462064faffd62d9332c0b271-1790483943274-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[3].payload.data.events
EVENTO_MUESTRA:
```json
{
  "nodeIdentifier": "1.134.253",
  "globalId": "event.1.134.253.f-JaOM8zRLW0KEEVu61Fb8gw",
  "categoryId": "1",
  "categoryName": "Fútbol",
  "categoryPopularityOrder": 0,
  "regionId": "134",
  "regionName": "Mexico",
  "competitionId": "253",
  "competitionName": "Mexico Liga MX",
  "competitionPopularityOrder": 0,
  "slug": "futbol/mexico/mexico-liga-mx/tigres-puebla",
  "participants": [
    {
      "label": "Tigres",
      "id": "1310",
      "sortOrder": 1,
      "side": 1,
      "logo": {
        "type": 2,
        "url": "https://sb-imageapi.bpsgameserver2.com/common/Common/Sportsbook/neutral/image/2026/08/participants-jerseys.football-line-h_v5.svg",
        "colours": [
          "#F2C500",
          "#004B87"
        ]
      }
    },
    {
      "label": "Puebla",
      "id": "16438",
      "sortOrder": 2,
      "side": 2,
      "logo": {
        "type": 2,
        "url": "https://sb-imageapi.bpsgameserver2.com/common/Common/Sportsbook/neutral/image/2026/08/participants-jerseys.football-line-d_v5.svg",
        "colours": [
          "#FFFFFF",
          "#0095D9"
        ]
      }
    }
  ],
  "subParticipants": [
    {
      "id": "15602",
      "label": "André-Pierre Gignac",
      "side": 1
    },
    {
      "id": "129235",
      "label": "Nahuel Ignacio Guzmán",
      "side": 1
    },
    {
      "id": "161068",
      "label": "Osvaldo Rodríguez",
      "side": 1
    },
    {
      "id": "167095",
      "label": "Jesús Alberto Angulo",
      "side": 1
    },
    {
      "id": "206745",
      "label": "D. Roy",
      "side": 1
    },
    {
      "id": "290203",
      "label": "G. Martínez",
      "side": 1
    },
    {
      "id": "387992",
      "label": "Edgar",
      "side": 1
    },
    {
      "id": "401357",
      "label": "J. Brunetta",
      "side": 1
    },
    {
      "id": "426704",
      "label": "Diego Lainez",
      "side": 1
    },
    {
      "id": "441600",
      "label": "A. Franco",
      "side": 1
    },
    {
      "id": "655143",
      "label": "V. Loroña",
      "side": 1
    },
    {
      "id": "1008321",
      "label": "R. Monreal",
      "side": 1
    },
    {
      "id": "1326390",
      "label": "J. Garza",
      "side": 1
    },
    {
      "id": "1712982",
      "label": "N. Ibáñez",
      "side": 1
    },
    {
      "id": "2748277",
      "label": "J. Vigon",
      "side": 1
    },
    {
      "id": "3454442",
      "label": "C. Araújo",
      "side": 1
    },
    {
      "id": "3758561",
      "label": "R. Guerrero",
      "side": 1
    },
    {
      "id": "4485941",
      "label": "A. Carrera",
      "side": 1
    },
    {
      "id": "5135480",
      "label": "Fernando Tapia",
      "side": 1
    },
    {
      "id": "5214708",
      "label": "Angel Correa",
      "side": 1
    },
    {
      "id": "5239469",
      "label": "Jonathan Herrera",
      "side": 1
    },
    {
      "id": "5345527",
      "label": "Marcelo Flores",
      "side": 1
    },
    {
      "id": "5827167",
      "label": "Juan Jose Sanchez Purata",
      "side": 1
    },
    {
      "id": "6020970",
      "label": "Rodrigo Aguirre",
      "side": 1
    },
    {
      "id": "6109376",
      "label": "Joaquim",
      "side": 1
    },
    {
      "id": "6352312",
      "label": "Mauro Laínez",
      "side": 1
    },
    {
      "id": "6611664",
      "label": "Antoino De Maria Campos",
      "side": 1
    },
    {
      "id": "6639524",
      "label": "Israel Aceves",
      "side": 1
    },
    {
      "id": "6671421",
      "label": "Simeone Koifman, Henrique",
      "side": 1
    },
    {
      "id": "6694811",
      "label": "Romulo",
      "side": 1
    },
    {
      "id": "6728637",
      "label": "No Goalscorer",
      "side": 1
    },
    {
      "id": "6855014",
      "label": "Diego Sánchez",
      "side": 1
    },
    {
      "id": "6855017",
      "label": "Felipe Rodriguez",
      "side": 1
    },
    {
      "id": "6855022",
      "label": "Fernando Ordóñez",
      "side": 1
    },
    {
      "id": "6855023",
      "label": "Eugenio Pizzuto",
      "side": 1
    },
    {
      "id": "6855025",
      "label": "Fernando Gorriaran Fontes",
      "side": 1
    },
    {
      "id": "8033378",
      "label": "F. Reyes",
      "side": 1
    },
    {
      "id": "8057624",
      "label": "Luis Gomez",
      "side": 1
    },
    {
      "id": "8153960",
      "label": "Jean Unjanque",
      "side": 1
    },
    {
      "id": "8227500",
      "label": "Galvan, Isac",
      "side": 1
    },
    {
      "id": "8276321",
      "label": "Salazar, Bryan",
      "side": 1
    },
    {
      "id": "8368916",
      "label": "Francisco Reyes",
      "side": 1
    },
    {
      "id": "8368918",
      "label": "Simeone",
      "side": 1
    },
    {
      "id": "8417557",
      "label": "Salinas, Marcelo",
      "side": 1
    },
    {
      "id": "8417558",
      "label": "Ramirez, Angel",
      "side": 1
    },
    {
      "id": "8466376",
      "label": "Diego Ramirez",
      "side": 1
    },
    {
      "id": "8485041",
      "label": "Edgar Joshimar Villavicencio Avila",
      "side": 1
    },
    {
      "id": "8522043",
      "label": "Aceve, Israel",
      "side": 1
    },
    {
      "id": "8536568",
      "label": "Israel Aceves",
      "side": 1
    },
    {
      "id": "92033",
      "label": "E. Pogatetz",
      "side": 2
    },
    {
      "id": "105014",
      "label": "Jair Alberto Díaz",
      "side": 2
    },
    {
      "id": "171045",
      "label": "A. Canelo",
      "side": 2
    },
    {
      "id": "183648",
      "label": "L. Cavallini",
      "side": 2
    },
    {
      "id": "340214",
      "label": "A. Araos",
      "side": 2
    },
    {
      "id": "364448",
      "label": "J. Vargas",
      "side": 2
    },
    {
      "id": "411720",
      "label": "B. Garnica",
      "side": 2
    },
    {
      "id": "435798",
      "label": "U. Torres Méndez",
      "side": 2
    },
    {
      "id": "468376",
      "label": "J. Rodríguez",
      "side": 2
    },
    {
      "id": "558667",
      "label": "N. Diaz",
      "side": 2
    },
    {
      "id": "912294",
      "label": "R. Castillo",
      "side": 2
    },
    {
      "id": "944939",
      "label": "F. Almada",
      "side": 2
    },
    {
      "id": "2113509",
      "label": "E. Lozano",
      "side": 2
    },
    {
      "id": "2113544",
      "label": "R. Gutierrez",
      "side": 2
    },
    {
      "id": "2113570",
      "label": "E. Mustre",
      "side": 2
    },
    {
      "id": "2410774",
      "label": "L. Hernández",
      "side": 2
    },
    {
      "id": "2599096",
      "label": "A. Robles",
      "side": 2
    },
    {
      "id": "3126991",
      "label": "H. Jurado",
      "side": 2
    },
    {
      "id": "3255463",
      "label": "I. Puch",
      "side": 2
    },
    {
      "id": "5031552",
      "label": "Carlos Baltazar",
      "side": 2
    },
    {
      "id": "5889939",
      "label": "Owen González",
      "side": 2
    },
    {
      "id": "6218780",
      "label": "Mathias Tomas",
      "side": 2
    },
    {
      "id": "6244825",
      "label": "Emiliano Gomez",
      "side": 2
    },
    {
      "id": "6504501",
      "label": "Jose Pachuca",
      "side": 2
    },
    {
      "id": "6504518",
      "label": "Fernando David Arce Juarez",
      "side": 2
    },
    {
      "id": "6765982",
      "label": "Alonso Ramirez",
      "side": 2
    },
    {
      "id": "6766015",
      "label": "Eduardo Armenta",
      "side": 2
    },
    {
      "id": "6766046",
      "label": "Angel Leyva",
      "side": 2
    },
    {
      "id": "6766061",
      "label": "Samuel Gonzalez",
      "side": 2
    },
    {
      "id": "6766063",
      "label": "Eduardo Navarro",
      "side": 2
    },
    {
      "id": "6766064",
      "label": "Dylan Torres",
      "side": 2
    },
    {
      "id": "6766073",
      "label": "Denilson Guvido Paz",
      "side": 2
    },
    {
      "id": "6766076",
      "label": "Joan Nungaray",
      "side": 2
    },
    {
      "id": "6766079",
      "label": "Gonzalez M",
      "side": 2
    },
    {
      "id": "6766084",
      "label": "Julio Gonzalez",
      "side": 2
    },
    {
      "id": "6855564",
      "label": "Ariel Gamarra",
      "side": 2
    },
    {
      "id": "7031985",
      "label": "Edgar Guerra",
      "side": 2
    },
    {
      "id": "7031986",
      "label": "Alejandro Organista",
      "side": 2
    },
    {
      "id": "7031989",
      "label": "Alberto Herrera",
      "side": 2
    },
    {
      "id": "7431665",
      "label": "Lucas Camilo",
      "side": 2
    },
    {
      "id": "7490326",
      "label": "Omar Fernando Moreno Villegas",
      "side": 2
    },
    {
      "id": "7514897",
      "label": "Kevin Velasco",
      "side": 2
    },
    {
      "id": "7647739",
      "label": "Fernando Monarrez Ochoa",
      "side": 2
    },
    {
      "id": "7745461",
      "label": "Brian Hernandez",
      "side": 2
    },
    {
      "id": "7768884",
      "label": "Alvaro De La Rosa",
      "side": 2
    },
    {
      "id": "7957413",
      "label": "Oscar Villa",
      "side": 2
    },
    {
      "id": "7957494",
      "label": "Iker Moreno",
      "side": 2
    },
    {
      "id": "7957495",
      "label": "Jafet Cortes",
      "side": 2
    },
    {
      "id": "7957496",
      "label": "Walter Portales",
      "side": 2
    },
    {
      "id": "7957497",
      "label": "Miguel Ramirez",
      "side": 2
    },
    {
      "id": "7957499",
      "label": "Arath Zavala",
      "side": 2
    },
    {
      "id": "8264301",
      "label": "Arez Perez",
      "side": 2
    },
    {
      "id": "8365446",
      "label": "Mathias Tomas",
      "side": 2
    },
    {
      "id": "8441604",
      "label": "Ortega Chavez, Yael",
      "side": 2
    },
    {
      "id": "8505735",
      "label": "Sergio Sanabria",
      "side": 2
    }
  ],
  "marketCount": 1,
  "phase": "Live",
  "hasLiveStreaming": false,
  "hasLiveStatistics": false,
  "hasLiveVisual": false,
  "hasLivePlayerStats": false,
  "startDate": "2026-09-27T03:10:00Z",
  "popularityOrder": 191,
  "eventType": "Fixture",
  "categoryTrackingLabel": "football",
  "competitionTrackingLabel": "mexico-liga-mx",
  "regionTrackingLabel": "mexico",
  "prematchStatisticsProviders": [],
  "actualSubCategoryId": 253,
  "marketCountUnique": 0,
  "neutralPath": "football/mexico/mexico-liga-mx/tigres-puebla",
  "isFullScreenEnabled": false,
  "tags": {
    "sb-tg-alpha": {
      "name": "sb-tg-alpha",
      "attributes": {
        "tg-routing": "sb-tg-alpha=1;"
      }
    },
    "bc_bb_available": {
      "name": "bc_bb_available",
      "attributes": {}
    },
    "sb-traded-live": {
      "name": "sb-traded-live",
      "attributes": {}
    },
    "sb-traded-prematch": {
      "name": "sb-traded-prematch",
      "attributes": {}
    }
  },
  "id": "f-JaOM8zRLW0KEEVu61Fb8gw",
  "label": "Tigres - Puebla",
  "isHomeTeam": false
}
```
PATH_LOCAL: evidence.payload.captures[3].payload.data.events[0].participants[0].label
PATH_VISITANTE: evidence.payload.captures[3].payload.data.events[0].participants[1].label
PATH_FECHA: evidence.payload.captures[3].payload.data.events[0].startDate
PATH_ODDS: evidence.payload.captures[3].payload.data.selections[0].odds (join marketId)
PATH_LIGA: evidence.payload.captures[3].payload.data.events[0].competitionName
BACKEND: FEAPI prematch
RAW: .engine/raw/2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741641268-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[1].payload.D.E
EVENTO_MUESTRA:
```json
{
  "ID": 842984180,
  "D": "2026-09-30 06:00:00",
  "N": "South Korea U23 - China",
  "C": "2597",
  "EXTID": "75066458",
  "PRV": true,
  "ISSTREAMINGVIDEO": false,
  "O": {
    "S_1X2_1": "1.21",
    "S_1X2_X": "5.6",
    "S_1X2_2": "13.25",
    "S_DC_1X": "1",
    "S_DC_12": "1.1",
    "S_DC_X2": "3.8",
    "S_OU@0.5_O": "1.03",
    "S_OU@0.5_U": "11",
    "S_OU@1.5_O": "1.23",
    "S_OU@1.5_U": "3.65",
    "S_OU@2.5_O": "1.8",
    "S_OU@2.5_U": "1.9",
    "S_OU@3.5_O": "3.05",
    "S_OU@3.5_U": "1.31",
    "S_OU@4.5_O": "1",
    "S_OU@4.5_U": "1",
    "S_GGNG_Y": "2.77",
    "S_GGNG_N": "1.39",
    "S_OE_OD": "1.88",
    "S_OE_EV": "1.83",
    "S_1X21T_1": "1.6",
    "S_1X21T_X": "2.44",
    "S_1X21T_2": "10.5",
    "S_DC1T_1X": "1",
    "S_DC1T_12": "1.39",
    "S_DC1T_X2": "1.99",
    "S_OU1T@0.5_O": "1.31",
    "S_OU1T@0.5_U": "2.93",
    "S_OU1T@1.5_O": "2.63",
    "S_OU1T@1.5_U": "1.39",
    "S_OU1T@2.5_O": "6.7",
    "S_OU1T@2.5_U": "1.05",
    "S_HTFT_1/1": "1.66",
    "S_HTFT_1/X": "23",
    "S_HTFT_1/2": "45",
    "S_HTFT_X/1": "3.75",
    "S_HTFT_X/X": "7.2",
    "S_HTFT_X/2": "21",
    "S_HTFT_2/1": "24",
    "S_HTFT_2/X": "23",
    "S_HTFT_2/2": "20",
    "S_DNB_1": "1",
    "S_DNB_2": "10.75",
    "S_GGNG2PLUS_GG": "15",
    "S_CHANCEMIXGGOU@2.5_1orOv": "1.12",
    "S_CHANCEMIXGGOU@2.5_XorOv": "1.42",
    "S_CHANCEMIXGGOU@2.5_2orOv": "1.68",
    "S_CHANCEMIXGGOU@2.5_1orUn": "1",
    "S_CHANCEMIXGGOU@2.5_XorUn": "1.82",
    "S_CHANCEMIXGGOU@2.5_2orUn": "1.82",
    "S_CHANCEMIXGGOU@2.5_GGOU": "1.24",
    "S_CHANCEMIXGGOU@2.5_NGOO": "1",
    "S_CHANCEMIXGGOU@2.5_GGOO": "1.57",
    "S_CHANCEMIXGGOU@2.5_NGOU": "1.23",
    "S_HAOU@0.5_OH": "1",
    "S_HAOU@0.5_OA": "1",
    "S_HAOU@0.5_UH": "1",
    "S_HAOU@0.5_UA": "1",
    "S_HAOU@1.5_OH": "1",
    "S_HAOU@1.5_OA": "1",
    "S_HAOU@1.5_UH": "1",
    "S_HAOU@1.5_UA": "1",
    "S_HAOU@2.5_OH": "1",
    "S_HAOU@2.5_UH": "1",
    "S_HOMEWINHALF_Y": "1.09",
    "S_HOMEWINHALF_N": "5.4",
    "S_AWAYWINHALF_Y": "6.3",
    "S_AWAYWINHALF_N": "1.06",
    "S_1X2OU@1.5_XO": "1",
    "S_1X2OU@1.5_XU": "1",
    "S_1X2OU@2.5_1O": "1.83",
    "S_1X2OU@2.5_XO": "33",
    "S_1X2OU@2.5_2O": "32",
    "S_1X2OU@2.5_1U": "2.73",
    "S_1X2OU@2.5_XU": "6.2",
    "S_1X2OU@2.5_2U": "21",
    "S_1X2OU@3.5_1O": "3.15",
    "S_1X2OU@3.5_XO": "33",
    "S_1X2OU@3.5_2O": "73",
    "S_1X2OU@3.5_1U": "1.64",
    "S_1X2OU@3.5_XU": "6",
    "S_1X2OU@3.5_2U": "15",
    "S_DCOU@1.5_1XO": "1",
    "S_DCOU@1.5_12O": "1",
    "S_DCOU@1.5_X2O": "1",
    "S_DCOU@1.5_1XU": "1",
    "S_DCOU@1.5_12U": "1",
    "S_DCOU@1.5_X2U": "1",
    "S_DCOU@2.5_1XO": "1",
    "S_DCOU@2.5_12O": "1",
    "S_DCOU@2.5_X2O": "1",
    "S_DCOU@2.5_1XU": "1",
    "S_DCOU@2.5_12U": "1",
    "S_DCOU@2.5_X2U": "1",
    "S_DCOU@3.5_1XO": "1",
    "S_DCOU@3.5_12O": "1",
    "S_DCOU@3.5_X2O": "1",
    "S_DCOU@3.5_1XU": "1",
    "S_DCOU@3.5_12U": "1",
    "S_DCOU@3.5_X2U": "1",
    "S_1X2GGNG_1ANDGG": "1",
    "S_1X2GGNG_XANDGG": "1",
    "S_1X2GGNG_2ANDGG": "1",
    "S_1X2GGNG_1ANDNG": "1",
    "S_1X2GGNG_XANDNG": "1",
    "S_1X2GGNG_2ANDNG": "1"
  },
  "AUX": {
    "S_OU": {
      "0.5": 0.5,
      "1.5": 1.5,
      "2.5": 2.5,
      "3.5": 3.5,
      "4.5": 4.5
    },
    "S_OU1T": {
      "0.5": 0.5,
      "1.5": 1.5,
      "2.5": 2.5
    },
    "S_CHANCEMIXGGOU": {
      "2.5": 2.5
    },
    "S_HAOU": {
      "0.5": 0.5,
      "1.5": 1.5,
      "2.5": 2.5
    },
    "S_1X2OU": {
      "1.5": 1.5,
      "2.5": 2.5,
      "3.5": 3.5
    },
    "S_DCOU": {
      "1.5": 1.5,
      "2.5": 2.5,
      "3.5": 3.5
    }
  },
  "MKNUM": 107,
  "GID": 3971769,
  "EXCLUDED_BONUS": [],
  "BOOSTED_ODDS": [],
  "BOOSTED_MARKETS": []
}
```
PATH_LOCAL: null
PATH_VISITANTE: null
PATH_FECHA: evidence.payload.captures[1].payload.D.E[0].D
PATH_ODDS: evidence.payload.captures[1].payload.D.E[0].O["S_1X2_1"]
PATH_LIGA: evidence.payload.captures[1].payload.D.G["3971769"].N (join GID)
BACKEND: FEAPI live
RAW: .engine/raw/2594313ff4df00d1f2bae93b0ba525f26eb5580e9bc1dba1dfb7b706bac30310-1790741641268-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: null
EVENTOS_MAPA_PATH: evidence.payload.captures[2].payload.D.E (objeto, no array)
EVENTO_MUESTRA:
```json
{
  "INCTYPE": 0,
  "ST": 1,
  "GID": 42096,
  "C": 19510,
  "STARTDATE": "2026-09-30 04:05:00",
  "EXTID": "75082192",
  "SGID": "3000001_42096",
  "DS": "Paris Saint Germain (Dexter) - Manchester City FC (Felix)",
  "SID": 3000001,
  "WID": null,
  "PRV": 60,
  "ID": 10199510,
  "PL": 1,
  "TYPE": 0,
  "STARTDATEUTC": "2026-09-30T04:05:00Z",
  "BRMATCHID": 75082192,
  "ENDVISIBILITYDATE": "2026-09-30 04:05:00",
  "ISSTREAMINGVIDEO": false,
  "STID": "1",
  "EOD": {
    "A": {
      "A": true,
      "E": true,
      "MKNUM": 3,
      "EXTID": "75082192",
      "ISSTREAMINGVIDEO": false,
      "ES": "2nd Half",
      "BS": "2nd Half",
      "R": {
        "SS": [
          "0:0",
          "1:0"
        ],
        "S": "1:0",
        "EXTRA": "",
        "SRV": -1,
        "GS": ""
      },
      "WID": null,
      "T": 8,
      "PRV": 60,
      "ID": 10199510,
      "T2": "08'",
      "BRMATCHID": 75082192
    },
    "OD": {
      "LIVES_OE_EV": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 1.99,
        "j": true
      },
      "LIVES_1X2_1": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 1.2,
        "j": true
      },
      "LIVES_DC_X2": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 3.45,
        "j": true
      },
      "LIVES_OE_OD": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 1.68,
        "j": true
      },
      "LIVES_1X2_2": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 19,
        "j": true
      },
      "LIVES_DC_1X": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 1,
        "j": true
      },
      "LIVES_1X2_X": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 4.2,
        "j": true
      },
      "LIVES_DC_12": {
        "aa": true,
        "a": true,
        "s": 0,
        "v": 1.13,
        "j": true
      }
    }
  },
  "GPR": 170
}
```
PATH_LOCAL: null
PATH_VISITANTE: null
PATH_FECHA: evidence.payload.captures[2].payload.D.E["10199510"].STARTDATEUTC
PATH_ODDS: evidence.payload.captures[2].payload.D.E["10199510"].EOD.OD.LIVES_1X2_1.v
PATH_LIGA: evidence.payload.captures[2].payload.D.G["42096"].DS (join GID)
BACKEND: GraphQL
RAW: .engine/raw/df91da8902f73d167f7f58e08c3001f644ca3b439d8b837756195f56e47f4409-1790739669593-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.response.data.listContentCards.contentCards
EVENTO_MUESTRA:
```json
{
  "type": "MONEY_LINE",
  "card": {
    "id": 10029,
    "name": "T20 Uttarakhand Premier League",
    "regionId": "1dc0c5b4-b8d6-3e57-8aa7-86b3f305efa7",
    "away": {
      "id": "e2088d59-36dd-317a-ace5-419fa3a6c46d",
      "isBatting": false,
      "name": "Usn Indians",
      "__typename": "Participant"
    },
    "home": {
      "id": "608d209d-eca0-3d66-8090-178ef01e5ab4",
      "isBatting": false,
      "name": "Rishikesh River Kings",
      "__typename": "Participant"
    },
    "awayScore": 0,
    "homeScore": 0,
    "homeDismissals": 0,
    "awayDismissals": 0,
    "eventPhase": {
      "description": "",
      "showPhase": false,
      "__typename": "SBEventPhase"
    },
    "selections": [
      {
        "id": "4a1691ee-dcf6-32e8-ba17-96fb8d6e07ac",
        "name": "Rishikesh River Kings",
        "odds": 1.61,
        "eventId": "249c777b-5074-3b05-9dbd-70d4d99f4f00",
        "marketId": "fd47a863-e290-3cab-b5fc-5b988ae81581",
        "marketLineId": "48dbec65-9ddf-3811-84a1-63dcd9907547",
        "sportId": "51ba17ce-bf66-352f-a3bc-1e8984e1d4a7",
        "eventName": "Rishikesh River Kings vs. Usn Indians",
        "participantHomeName": "Rishikesh River Kings",
        "participantAwayName": "Usn Indians",
        "marketName": "Winner (incl. super over)",
        "eventStartDate": "1790744400000",
        "leagueId": "8a73b3fe-3619-35b3-91b9-be316a95d7a1",
        "leagueName": "T20 Uttarakhand Premier League",
        "sportName": "Cricket",
        "status": "CONTENT_CARD_SELECTION_STATUS_ACTIVE",
        "eventUrlPath": "/cricket/india-t20-uttarakhand-premier-league/rishikesh-river-kings-usn-indians-30092026/",
        "isLive": false,
        "__typename": "ContentCardSelection"
      },
      {
        "id": "1d9bb7d3-b986-3349-b2d4-bcb6f47d4f00",
        "name": "Usn Indians",
        "odds": 2.22,
        "eventId": "249c777b-5074-3b05-9dbd-70d4d99f4f00",
        "marketId": "fd47a863-e290-3cab-b5fc-5b988ae81581",
        "marketLineId": "48dbec65-9ddf-3811-84a1-63dcd9907547",
        "sportId": "51ba17ce-bf66-352f-a3bc-1e8984e1d4a7",
        "eventName": "Rishikesh River Kings vs. Usn Indians",
        "participantHomeName": "Rishikesh River Kings",
        "participantAwayName": "Usn Indians",
        "marketName": "Winner (incl. super over)",
        "eventStartDate": "1790744400000",
        "leagueId": "8a73b3fe-3619-35b3-91b9-be316a95d7a1",
        "leagueName": "T20 Uttarakhand Premier League",
        "sportName": "Cricket",
        "status": "CONTENT_CARD_SELECTION_STATUS_ACTIVE",
        "eventUrlPath": "/cricket/india-t20-uttarakhand-premier-league/rishikesh-river-kings-usn-indians-30092026/",
        "isLive": false,
        "__typename": "ContentCardSelection"
      }
    ],
    "activeOnLive": true,
    "earlyPayoutId": null,
    "__typename": "MoneyLineCard"
  },
  "__typename": "ContentCard"
}
```
PATH_LOCAL: evidence.payload.response.data.listContentCards.contentCards[0].card.home.name
PATH_VISITANTE: evidence.payload.response.data.listContentCards.contentCards[0].card.away.name
PATH_FECHA: evidence.payload.response.data.listContentCards.contentCards[0].card.selections[0].eventStartDate
PATH_ODDS: evidence.payload.response.data.listContentCards.contentCards[0].card.selections[0].odds
PATH_LIGA: evidence.payload.response.data.listContentCards.contentCards[0].card.selections[0].leagueName
BACKEND: React Flight
RAW: .engine/raw/bed9900eb3383ce6fb61b25a84b95ad6f009b6e96f8aabb7c51269f34dcb5951-1790505214444-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: null
EVENTOS_MAPA_PATH: evidence.payload.captures[0].payload[5].events (objeto, no array)
EVENTO_MUESTRA:
```json
{
  "Version": 988,
  "Id": 17254675,
  "GroupName": "NFL",
  "SubCategoryName": "EE. UU.",
  "CategoryCName": "american-football",
  "CategoryName": "Fútbol Americano",
  "HomeTeamName": "Pittsburgh Steelers",
  "AwayTeamName": "Cincinnati Bengals",
  "EventName": "Pittsburgh Steelers - Cincinnati Bengals",
  "Milliseconds": 1790528400000,
  "Date": "09/27/2026",
  "Time": "17:00",
  "MarketCount": 0,
  "Markets": [
    640129268
  ],
  "CouponMarketId": [
    640129268
  ],
  "FilterMarkets": {
    "money-line": 640129268
  },
  "IsSuspended": false,
  "LiveStreamingMobileStatus": null,
  "LiveStreamingProviderType": null,
  "LiveStreamingDesktopStatus": null,
  "IsOutright": false,
  "FeedId": 71515828,
  "SuperTournamentCName": null,
  "SuperTournamentName": null,
  "MarketGroups": {
    "main-markets": {
      "GroupName": "Mercados principales",
      "MarketIds": [
        640129268
      ]
    }
  },
  "IsLive": false,
  "IsPremium": false,
  "HomeTeamCName": "pittsburgh-steelers",
  "AwayTeamCName": "cincinnati-bengals",
  "GroupCName": "nfl",
  "SubCategoryCName": "usa",
  "VenueTime": null,
  "Venue": "",
  "Title": null,
  "IsLiveTraded": true,
  "AmericanFormat": true,
  "NeutralVenue": false,
  "SurfaceCName": null,
  "SurfaceName": "",
  "SportVariationCName": null,
  "SportVariationName": "",
  "SportsRadarId": null,
  "IsVirtual": false,
  "IsBetBuilderSupported": true
}
```
PATH_LOCAL: evidence.payload.captures[0].payload[5].events["17254675"].HomeTeamName
PATH_VISITANTE: evidence.payload.captures[0].payload[5].events["17254675"].AwayTeamName
PATH_FECHA: evidence.payload.captures[0].payload[5].events["17254675"].Milliseconds
PATH_ODDS: evidence.payload.captures[0].payload[5].outcomes["2643210121"].OddsDecimal (join EventId)
PATH_LIGA: evidence.payload.captures[0].payload[5].events["17254675"].GroupName
BACKEND: Kmianko
RAW: .engine/raw/84a2b728f9336952f1ffd6a45e554cdb91dc2ef542320694d71fd08edc03aee4-1790562899564-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: null
EVENTO_MUESTRA:
```json
null
```
RECORD_MUESTRA (el RAW contiene records normalizados; no conserva evento original):
```json
{
  "sportsbook": "apuestatotal",
  "bookmaker": "apuestatotal",
  "sport": "Fútbol",
  "competition": "UEFA Liga de Naciones A",
  "eventName": "Bélgica vs Francia",
  "participants": [
    "Bélgica",
    "Francia"
  ],
  "homeParticipant": "Bélgica",
  "awayParticipant": "Francia",
  "eventStartTime": "2026-09-28T18:45:00.000Z",
  "eventStatus": "prematch",
  "market": "Resultado del partido (1X2)",
  "marketPeriod": null,
  "selection": "Francia",
  "selectionStatus": null,
  "line": null,
  "rawOdds": "1.88",
  "rawOddsFormat": "decimal",
  "decimalOdds": 1.88,
  "sourceEventId": "889841824884338688",
  "sourceMarketId": "0ML889841825970753536",
  "sourceSelectionId": "0ML889841825970753536A",
  "sourceUrl": "https://prod20392.kmianko.com/api/sportscenter/carousels/v3/featured-carousel-items?language=ES-PE&customerLevel=0&epoEnabled=true&selectedOptionId=0&hasPlacedBets=false&isAnonymous=true&currencyCode=PEN&types=8%2C6%2C7%2C9&marketTypes=ML587%2CML0%2COU0%2CHC0%2CML39%2COU39%2CHC39&marketTypesBySports=%7B%221%22%3A%5B%22ML0%22%2C%22ML39%22%2C%22OU200%22%2C%22OU249%22%2C%22QA61%22%2C%22QA158%22%5D%2C%226%22%3A%5B%22ML0%22%2C%22OU0%22%2C%22HC0%22%2C%22ML39%22%2C%22OU39%22%2C%22HC39%22%2C%22ML716%22%2C%22ML717%22%2C%22ML718%22%2C%22ML719%22%2C%22ML720%22%5D%2C%2259%22%3A%5B%22ML587%22%2C%22ML0%22%2C%22OU0%22%2C%22HC0%22%2C%22ML39%22%2C%22OU39%22%2C%22HC39%22%5D%2C%22default%22%3A%5B%22ML0%22%2C%22OU0%22%2C%22HC0%22%2C%22ML39%22%2C%22OU39%22%2C%22HC39%22%2C%22OU6001%22%5D%7D&minimumOddsRestrictedMarkets=ML39%2CML13%2CML1%2CML169&minimumOdds=1.009&draft=false",
  "providerTimestamp": "2026-09-27T22:02:29.156Z",
  "collectedAt": "2026-09-28T02:34:59.563Z",
  "participantPlayer": null,
  "qualifiers": {
    "extraction": "network",
    "profileVersion": "apuestatotal-kmianko-v1"
  }
}
```
PATH_LOCAL: evidence.payload.records[0].homeParticipant (record normalizado; respuesta original ausente)
PATH_VISITANTE: evidence.payload.records[0].awayParticipant (record normalizado; respuesta original ausente)
PATH_FECHA: evidence.payload.records[0].eventStartTime (record normalizado; respuesta original ausente)
PATH_ODDS: evidence.payload.records[0].decimalOdds (record normalizado; respuesta original ausente)
PATH_LIGA: evidence.payload.records[0].competition (record normalizado; respuesta original ausente)
BACKEND: Codere
RAW: .engine/raw/9bf0691c2194341d046a1a63bd9a9350002ea015cc8e84db1a4bce871fa4f66c-1790505215265-network.json
TOP_LEVEL: ["source", "method", "retrievedAt", "recordCount", "evidence"]
PATH_EVENTOS: evidence.payload.captures[0].payload.ContentAPI.Sport[0].SBClass[0].SBType[0].Ev
EVENTO_MUESTRA:
```json
{
  "@inplay_allowed": "Y",
  "@status": "A",
  "@name": "Pumas UNAM v Atlético San Luis",
  "@start_time": "09/27/2026 18:00:00",
  "@virtual": "N",
  "@ev_timezone": "Europe/London",
  "@inplay_now": "N",
  "@mkt_count": "294",
  "@ev_id": "13924960",
  "@disporder": "-21",
  "EvDetail": [
    {
      "@bg_match_id": "13994964",
      "@br_match_id": "72055204"
    }
  ],
  "Teams": [
    {
      "Team": [
        {
          "@team_id": "174709",
          "@team_order": "0",
          "@name": "Pumas UNAM",
          "@short_name": "Pumas UNAM"
        },
        {
          "@team_id": "174741",
          "@team_order": "1",
          "@name": "Atlético San Luis",
          "@short_name": "Atlético San Luis"
        }
      ]
    }
  ],
  "Mkt": [
    {
      "@status": "A",
      "@fc_avail": "N",
      "@name": "1X2 - Momios Mejorados",
      "@mkt_id": "581581184",
      "@inplay_avail": "Y",
      "@disporder": "-95",
      "@tc_avail": "N",
      "@sp_avail": "N",
      "@mkt_sort": "MRES",
      "@lp_avail": "Y",
      "@mkt_sort_name": "MKT_SORT-MRES",
      "Seln": [
        {
          "@status": "A",
          "@name": "Pumas UNAM",
          "@seln_id": "1623941901",
          "@team_id": "174709",
          "@disporder": "0",
          "@seln_sort": "H",
          "Price": [
            {
              "@prc_type": "LP",
              "@dec_prc": "1.95",
              "@bet_ref": "MTYyMzk0MTkwMTo5NTAvMTAwMDo6MA",
              "@frac_prc": "950/1000",
              "@us_prc": "-106",
              "@last_change": "09/27/2026 08:24:07"
            }
          ]
        },
        {
          "@status": "A",
          "@name": "Draw",
          "@seln_id": "1623941900",
          "@team_id": null,
          "@disporder": "1",
          "@seln_sort": "D",
          "Price": [
            {
              "@prc_type": "LP",
              "@dec_prc": "3.70",
              "@bet_ref": "MTYyMzk0MTkwMDoyNzAwLzEwMDA6OjA",
              "@frac_prc": "2700/1000",
              "@us_prc": "+270",
              "@last_change": "09/27/2026 08:24:07"
            }
          ]
        },
        {
          "@status": "A",
          "@name": "Atlético San Luis",
          "@seln_id": "1623941899",
          "@team_id": "174741",
          "@disporder": "2",
          "@seln_sort": "A",
          "Price": [
            {
              "@prc_type": "LP",
              "@dec_prc": "3.45",
              "@bet_ref": "MTYyMzk0MTg5OToyNDUwLzEwMDA6OjA",
              "@frac_prc": "2450/1000",
              "@us_prc": "+245",
              "@last_change": "09/27/2026 08:24:07"
            }
          ]
        }
      ]
    }
  ]
}
```
PATH_LOCAL: evidence.payload.captures[0].payload.ContentAPI.Sport[0].SBClass[0].SBType[0].Ev[0].Teams[0].Team[0]["@name"]
PATH_VISITANTE: evidence.payload.captures[0].payload.ContentAPI.Sport[0].SBClass[0].SBType[0].Ev[0].Teams[0].Team[1]["@name"]
PATH_FECHA: evidence.payload.captures[0].payload.ContentAPI.Sport[0].SBClass[0].SBType[0].Ev[0]["@start_time"]
PATH_ODDS: evidence.payload.captures[0].payload.ContentAPI.Sport[0].SBClass[0].SBType[0].Ev[0].Mkt[0].Seln[0].Price[0]["@dec_prc"]
PATH_LIGA: evidence.payload.captures[0].payload.ContentAPI.Sport[0].SBClass[0].SBType[0]["@name"]
