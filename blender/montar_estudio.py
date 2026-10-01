"""
Monta o estúdio de apresentação em volta dos aparelhos: fundo todo escuro, chão
que só aparece nos reflexos, luzes de estúdio, câmera e o conteúdo do site nas telas.

Como usar: rode depois de gerar_aparelhos.py (aba Scripting > Open > Run Script).
Se os aparelhos ainda não estiverem na cena, este script chama o gerador antes.
"""
import bpy, math, os, runpy

D = bpy.data

def pasta_script():
    candidatos = []
    try:
        candidatos.append(os.path.dirname(os.path.abspath(__file__)))
    except NameError:
        pass
    candidatos += [os.path.dirname(bpy.path.abspath(t.filepath)) for t in D.texts if t.filepath.endswith("montar_estudio.py")]
    for c in candidatos:
        if c and os.path.isfile(os.path.join(c, "gerar_aparelhos.py")):
            return c
    raise RuntimeError("Não achei a pasta blender/ do projeto. Abra este arquivo a partir dela.")

PASTA = pasta_script()
G = runpy.run_path(os.path.join(PASTA, "gerar_aparelhos.py"), run_name="biblioteca")

def colecao():
    return bpy.context.scene.collection

def ligar(o):
    if o.name not in bpy.context.scene.objects:
        colecao().objects.link(o)

def principled(m):
    nt = m.node_tree
    p = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if p is None:
        p = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(p.outputs[0], out.inputs["Surface"])
    return p

# ---------------------------------------------------------------- aparelhos e suporte
def garantir_aparelhos():
    if "Notebook" not in D.objects or "Celular" not in D.objects:
        G["main"]()
    antigo = D.objects.get("Suporte")
    if antigo and antigo.type == "MESH":           # base redonda da versão anterior
        D.objects.remove(antigo)
    if not any(o.name.startswith("PhoneSlot") for o in D.objects):
        G["criar_suporte"](G["criar_materiais"]())
    nb, cel, sup = D.objects["Notebook"], D.objects["Celular"], D.objects["Suporte"]
    nb.location = (-0.8, 0, 0); nb.rotation_euler = (0, 0, math.radians(-12))
    D.objects["LidPivot"].rotation_euler = (math.radians(-12), 0, 0)
    sup.location = (2.2, -0.2, 0); sup.rotation_euler = (0, 0, math.radians(-24))
    G["encaixar_celular"](cel, sup)

def telas():
    arquivos = {"LidPivot": "tela_notebook.png", "Celular": "tela_celular.png"}
    for o in D.objects:
        if not (o.type == "MESH" and o.name.startswith("screen")):
            continue
        dono = o.parent.name if o.parent else ""
        arq = arquivos.get(dono)
        caminho = os.path.join(PASTA, "telas", arq or "")
        if not arq or not os.path.isfile(caminho):
            continue
        m = D.materials.get("Tela_" + arq) or D.materials.new("Tela_" + arq)
        m.use_nodes = True
        p = principled(m); nt = m.node_tree
        t = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None) or nt.nodes.new("ShaderNodeTexImage")
        t.image = D.images.load(caminho, check_existing=True)
        nt.links.new(t.outputs["Color"], p.inputs["Emission Color"])
        p.inputs["Emission Strength"].default_value = 1.15
        p.inputs["Base Color"].default_value = (0, 0, 0, 1)
        p.inputs["Specular IOR Level"].default_value = 0.15
        p.inputs["Roughness"].default_value = 0.35
        p.inputs["Coat Weight"].default_value = 0.1
        o.data.materials.clear(); o.data.materials.append(m)
        # a tela aparece para a câmera, mas não ilumina nem reflete no chassi e no teclado
        o.visible_diffuse = False
        o.visible_glossy = False

# ---------------------------------------------------------------- ambiente escuro
def ambiente():
    s = bpy.context.scene
    w = s.world or D.worlds.new("Mundo"); s.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs["Color"].default_value = (0, 0, 0, 1)
    bg.inputs["Strength"].default_value = 0.0

    chao = D.objects.get("Chao")
    if chao is None:
        me = D.meshes.new("Chao"); me.from_pydata([(-40, -40, 0), (40, -40, 0), (40, 40, 0), (-40, 40, 0)], [], [(0, 1, 2, 3)])
        chao = D.objects.new("Chao", me); ligar(chao)
    fm = D.materials.get("Chao") or D.materials.new("Chao"); fm.use_nodes = True
    p = principled(fm)
    p.inputs["Base Color"].default_value = (0.004, 0.004, 0.005, 1)   # quase preto: aparece só o reflexo
    p.inputs["Roughness"].default_value = 0.28
    p.inputs["Specular IOR Level"].default_value = 0.06   # reflexo fraco, sem mancha clara
    chao.data.materials.clear(); chao.data.materials.append(fm)

def luzes():
    for nome in ("Light", "Luz", "Luz_Frontal"):
        if nome in D.objects:
            D.objects.remove(D.objects[nome])
    def area(nome, loc, rot, tam, energia, cor=(1, 1, 1), abertura=70):
        l = D.lights.get(nome) or D.lights.new(nome, "AREA")
        l.size = tam; l.energy = energia; l.color = cor
        l.spread = math.radians(abertura)            # facho mais fechado: ilumina os aparelhos, não o chão
        o = D.objects.get(nome) or D.objects.new(nome, l); ligar(o)
        o.location = loc; o.rotation_euler = rot
    area("Luz_Principal", (-3.5, -4.5, 5.5), (math.radians(42), 0, math.radians(-38)), 3, 650, abertura=55)
    area("Luz_Recorte", (3.6, 4.2, 4.6), (math.radians(-48), 0, math.radians(145)), 2.5, 420, (0.6, 0.72, 1.0), 32)  # atrás, sem refletir no chão em frente à câmera
    area("Luz_Fundo", (-1.0, 4.0, 3.5), (math.radians(-60), 0, math.radians(180)), 3, 260, (0.6, 0.72, 1.0), 45)

def camera():
    s = bpy.context.scene
    cd = D.cameras.get("CameraVitrine") or D.cameras.new("CameraVitrine"); cd.lens = 50
    cam = D.objects.get("CameraVitrine") or D.objects.new("CameraVitrine", cd); ligar(cam)
    cam.location = (0.9, -8.8, 3.3)
    alvo = D.objects.get("AlvoCamera") or D.objects.new("AlvoCamera", None); ligar(alvo)
    alvo.location = (0.9, -0.1, 1.05)
    if not cam.constraints:
        c = cam.constraints.new("TRACK_TO"); c.target = alvo
    cd.dof.use_dof = True; cd.dof.focus_object = alvo; cd.dof.aperture_fstop = 11   # desfoque leve: notebook e celular nítidos
    s.camera = cam
    for nome in ("Camera", "Câmera"):
        o = D.objects.get(nome)
        if o and o != cam:
            D.objects.remove(o)
    s.render.resolution_x, s.render.resolution_y = 1600, 1000
    s.view_settings.view_transform = "AgX"
    try:
        s.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    try:
        s.eevee.use_raytracing = True
    except Exception:
        pass

def olhar_pela_camera():
    wm = bpy.context.window_manager
    for win in wm.windows:
        for ar in win.screen.areas:
            if ar.type == "VIEW_3D":
                for sp in ar.spaces:
                    if sp.type == "VIEW_3D":
                        sp.shading.type = "RENDERED"
                        sp.region_3d.view_perspective = "CAMERA"
                        sp.overlay.show_overlays = False

def main():
    garantir_aparelhos()
    telas()
    ambiente()
    luzes()
    camera()
    if bpy.context.window_manager.windows:
        olhar_pela_camera()

if __name__ == "__main__":
    main()
