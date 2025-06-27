export type TextField = {
  type: "text";
  label: string;
  name: string;
  placeholder?: string;
};

export type SelectField = {
  type: "select";
  label: string;
  name: string;
  options: string[];
};

export type FormField = TextField | SelectField;

export interface FormBoxSpec {
  heading: string;
  submitLabel: string;
  fields: FormField[];
}

export function buildFormBox(spec: FormBoxSpec): HTMLFormElement {
  const form = document.createElement("form");
   form.className =
    "w-full max-w-md rounded-xl shadow-xl/20 " +
    "bg-[#0d2551] text-white backdrop-blur-sm bg-opacity-90 " +
    "p-8 space-y-6";

  const h = document.createElement("h2");
  h.textContent = spec.heading;
  h.className = "text-2xl font-bold text-center";
  form.appendChild(h);

  spec.fields.forEach((field) => {
    const block = document.createElement("div");
    block.className = "space-y-1";

    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = field.name;
    label.className = "text-sm";
    block.appendChild(label);

    if (field.type === "text") {
      const input = document.createElement("input");
      input.type = "text";
      input.id = input.name = field.name;
      input.placeholder = field.placeholder ?? "";
      input.className =
        "w-full px-4 py-2 rounded-md bg-[#081a37] " +
        "focus:outline-none focus:ring-2 focus:ring-sky-400 " +
        "placeholder-gray-400";
      block.appendChild(input);
    } else {
      const select = document.createElement("select");
      select.id = select.name = field.name;
      select.className =
        "w-full px-4 py-2 rounded-md bg-[#081a37] " +
        "focus:outline-none focus:ring-2 focus:ring-sky-400";
      field.options.forEach((opt) => {
        const o = document.createElement("option");
        o.value = o.textContent = opt;
        select.appendChild(o);
      });
      block.appendChild(select);
    }

    form.appendChild(block);
  });

  const btn = document.createElement("button");
  btn.type = "submit";
  btn.textContent = spec.submitLabel;
  btn.className =
    "w-full py-3 rounded-md text-lg font-semibold " +
    "bg-gradient-to-r from-orange-500 to-orange-400 " +
    "hover:opacity-90 transition";
  form.appendChild(btn);

  return form;
}