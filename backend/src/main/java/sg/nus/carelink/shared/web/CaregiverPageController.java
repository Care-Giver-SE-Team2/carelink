package sg.nus.carelink.shared.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Only SPA document routes; API and asset failures must retain their real HTTP status. */
@Controller
class CaregiverPageController {
    @GetMapping({"/caregiver", "/caregiver/", "/caregiver/visits/{visitId}"})
    String page() { return "forward:/index.html"; }
}
